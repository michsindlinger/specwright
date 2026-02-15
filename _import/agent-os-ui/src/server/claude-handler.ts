import { WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { getProviderCommand, getDefaultSelection } from './model-config.js';
import type { ImageInfo } from './image-storage.js';
import { SpecsReader } from './specs-reader.js';

const specsReader = new SpecsReader();

/**
 * Spawns a process using the user's login shell to ensure OAuth credentials
 * and shell profile configurations are available (needed for Claude Max).
 */
function spawnWithLoginShell(
  command: string,
  args: string[],
  options: Parameters<typeof spawn>[2]
): ChildProcess {
  const userShell = process.env.SHELL || '/bin/zsh';

  // Build the full command string with proper escaping
  const fullCommand = [command, ...args]
    .map(arg => {
      // Escape single quotes and wrap in single quotes for shell safety
      if (arg.includes("'") || arg.includes(' ') || arg.includes('"') || arg.includes('$') || arg.includes('\\')) {
        return `'${arg.replace(/'/g, "'\\''")}'`;
      }
      return arg;
    })
    .join(' ');

  console.log(`[Claude] Spawning via login shell: ${userShell} -l -c "${fullCommand.substring(0, 100)}..."`);

  return spawn(userShell, ['-l', '-c', fullCommand], options);
}

/**
 * Image reference stored with a chat message
 */
export interface ChatMessageImage {
  /** Relative path to the image file */
  path: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  /** Images attached to this message (for user messages) */
  images?: ChatMessageImage[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

export interface ModelSelection {
  providerId: string;
  modelId: string;
}

export interface ClaudeSession {
  id: string;
  projectPath: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  claudeProcess?: ChildProcess;
  selectedModel: ModelSelection;
}

interface WebSocketClient extends WebSocket {
  clientId: string;
}

export class ClaudeHandler {
  private sessions: Map<string, ClaudeSession> = new Map();

  public async handleChatSend(
    client: WebSocketClient,
    message: string,
    projectPath: string,
    specId?: string
  ): Promise<void> {
    const sessionId = this.getOrCreateSession(client.clientId, projectPath);
    const session = this.sessions.get(sessionId)!;

    if (session.isStreaming) {
      this.sendToClient(client, {
        type: 'chat.error',
        error: 'A response is already in progress',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    session.messages.push(userMessage);

    this.sendToClient(client, {
      type: 'chat.message',
      message: userMessage,
      timestamp: new Date().toISOString()
    });

    session.isStreaming = true;

    // Load spec context if specId is provided
    let fullMessage = message;
    if (specId) {
      console.log(`[Claude] Loading spec context for ${specId}`);
      const specContext = await specsReader.getSpecContext(projectPath, specId);
      fullMessage = `Context from Spec ${specId}:\n${specContext}\n\nUser Message: ${message}`;
    }

    await this.streamResponse(client, session, fullMessage);
  }

  /**
   * CIMG-004: Handle chat messages with image attachments.
   * Stores image references and sends them to Claude for vision analysis.
   */
  public async handleChatSendWithImages(
    client: WebSocketClient,
    message: string,
    projectPath: string,
    images: ImageInfo[]
  ): Promise<void> {
    const sessionId = this.getOrCreateSession(client.clientId, projectPath);
    const session = this.sessions.get(sessionId)!;

    if (session.isStreaming) {
      this.sendToClient(client, {
        type: 'chat.error',
        error: 'A response is already in progress',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Convert ImageInfo to ChatMessageImage
    const messageImages: ChatMessageImage[] = images.map(img => ({
      path: img.path,
      filename: img.filename,
      mimeType: img.mimeType
    }));

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      images: messageImages.length > 0 ? messageImages : undefined
    };

    session.messages.push(userMessage);

    this.sendToClient(client, {
      type: 'chat.message',
      message: userMessage,
      timestamp: new Date().toISOString()
    });

    session.isStreaming = true;

    // Stream response with images context
    await this.streamResponseWithImages(client, session, message, images, projectPath);
  }

  private getOrCreateSession(clientId: string, projectPath: string): string {
    const sessionId = `${clientId}-${projectPath}`;

    if (!this.sessions.has(sessionId)) {
      const defaultModel = getDefaultSelection();
      this.sessions.set(sessionId, {
        id: sessionId,
        projectPath,
        messages: [],
        isStreaming: false,
        selectedModel: defaultModel
      });
    }

    return sessionId;
  }

  private async streamResponse(
    client: WebSocketClient,
    session: ClaudeSession,
    userMessage: string
  ): Promise<void> {
    const messageId = crypto.randomUUID();
    const toolCalls: ToolCall[] = [];
    let fullContent = '';

    try {
      this.sendToClient(client, {
        type: 'chat.stream.start',
        messageId,
        timestamp: new Date().toISOString()
      });

      // Use Claude Code CLI for real API responses
      await this.streamClaudeCodeResponse(
        client,
        session,
        userMessage,
        messageId,
        toolCalls,
        (content: string) => {
          fullContent += content;
        }
      );

      const assistantMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };

      session.messages.push(assistantMessage);

      this.sendToClient(client, {
        type: 'chat.complete',
        messageId,
        message: assistantMessage,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.sendToClient(client, {
        type: 'chat.error',
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      session.isStreaming = false;
    }
  }

  /**
   * CIMG-004: Stream response for messages with images.
   * Passes image file paths to Claude CLI for vision analysis.
   */
  private async streamResponseWithImages(
    client: WebSocketClient,
    session: ClaudeSession,
    userMessage: string,
    images: ImageInfo[],
    projectPath: string
  ): Promise<void> {
    const messageId = crypto.randomUUID();
    const toolCalls: ToolCall[] = [];
    let fullContent = '';

    try {
      this.sendToClient(client, {
        type: 'chat.stream.start',
        messageId,
        timestamp: new Date().toISOString()
      });

      // Use Claude Code CLI for real API responses with images
      await this.streamClaudeCodeResponseWithImages(
        client,
        session,
        userMessage,
        images,
        projectPath,
        messageId,
        toolCalls,
        (content: string) => {
          fullContent += content;
        }
      );

      const assistantMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };

      session.messages.push(assistantMessage);

      this.sendToClient(client, {
        type: 'chat.complete',
        messageId,
        message: assistantMessage,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.sendToClient(client, {
        type: 'chat.error',
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      session.isStreaming = false;
    }
  }

  private async streamClaudeCodeResponse(
    client: WebSocketClient,
    session: ClaudeSession,
    userMessage: string,
    messageId: string,
    toolCalls: ToolCall[],
    onContent: (content: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get the CLI command based on selected model
      const { providerId, modelId } = session.selectedModel;
      const providerCommand = getProviderCommand(providerId, modelId);

      if (!providerCommand) {
        reject(new Error(`Model nicht verfügbar: Provider "${providerId}" oder Model "${modelId}" nicht gefunden`));
        return;
      }

      const { command, args: modelArgs } = providerCommand;

      // Build CLI arguments: model args + standard flags + user message
      const cliArgs = [
        ...modelArgs,
        '--print',           // Print response without interactive mode
        '--verbose',         // Required for stream-json output
        '--output-format', 'stream-json',  // Stream JSON events
        userMessage
      ];

      console.log('[Claude] Spawning CLI:', command, cliArgs.slice(0, 4).join(' '), '...');
      console.log('[Claude] Working directory:', session.projectPath);
      console.log('[Claude] Selected model:', `${providerId}/${modelId}`);

      // Remove ANTHROPIC_API_KEY to use Claude Max OAuth instead of API key auth
      const { ANTHROPIC_API_KEY: _removed, ...envWithoutApiKey } = process.env;

      const claudeProcess = spawnWithLoginShell(command, cliArgs, {
        cwd: session.projectPath,
        env: { ...envWithoutApiKey },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      session.claudeProcess = claudeProcess;
      console.log('[Claude] Process spawned with PID:', claudeProcess.pid);

      // Close stdin immediately - Claude CLI doesn't need interactive input in --print mode
      claudeProcess.stdin?.end();

      let currentToolCall: ToolCall | null = null;
      let buffer = '';

      claudeProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        console.log('[Claude stdout]:', chunk.substring(0, 200));
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);
            console.log('[Claude event]:', event.type);
            this.handleClaudeEvent(
              client,
              messageId,
              event,
              toolCalls,
              currentToolCall,
              onContent,
              (tc) => { currentToolCall = tc; }
            );
          } catch {
            // Non-JSON output, treat as plain text
            if (line.trim()) {
              onContent(line + '\n');
              this.sendToClient(client, {
                type: 'chat.stream',
                messageId,
                delta: line + '\n',
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      });

      claudeProcess.stderr?.on('data', (data: Buffer) => {
        const errorText = data.toString();
        console.error('[Claude CLI stderr]:', errorText);
        // Don't reject on stderr - Claude CLI uses it for status messages
      });

      claudeProcess.on('close', (code) => {
        console.log('[Claude] Process closed with code:', code);
        session.claudeProcess = undefined;
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            this.handleClaudeEvent(
              client,
              messageId,
              event,
              toolCalls,
              currentToolCall,
              onContent,
              (tc) => { currentToolCall = tc; }
            );
          } catch {
            if (buffer.trim()) {
              onContent(buffer);
              this.sendToClient(client, {
                type: 'chat.stream',
                messageId,
                delta: buffer,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Claude CLI exited with code ${code}`));
        }
      });

      claudeProcess.on('error', (error) => {
        console.error('[Claude] Process error:', error);
        session.claudeProcess = undefined;
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`Model nicht verfügbar: CLI-Befehl "${command}" nicht in PATH gefunden`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * CIMG-004: Stream Claude CLI response with image attachments.
   * Uses --add-images flag to pass image files to Claude for vision analysis.
   */
  private async streamClaudeCodeResponseWithImages(
    client: WebSocketClient,
    session: ClaudeSession,
    userMessage: string,
    images: ImageInfo[],
    projectPath: string,
    messageId: string,
    toolCalls: ToolCall[],
    onContent: (content: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get the CLI command based on selected model
      const { providerId, modelId } = session.selectedModel;
      const providerCommand = getProviderCommand(providerId, modelId);

      if (!providerCommand) {
        reject(new Error(`Model nicht verfügbar: Provider "${providerId}" oder Model "${modelId}" nicht gefunden`));
        return;
      }

      const { command, args: modelArgs } = providerCommand;

      // Build CLI arguments: model args + standard flags + image files + user message
      const cliArgs = [
        ...modelArgs,
        '--print',           // Print response without interactive mode
        '--verbose',         // Required for stream-json output
        '--output-format', 'stream-json'  // Stream JSON events
      ];

      // CIMG-007: Add image files using --image flag for Claude Vision
      // Claude CLI expects full path to image files (absolute paths)
      // Each image needs its own --image flag
      const validImages: string[] = [];
      const missingImages: string[] = [];

      for (const image of images) {
        const fullImagePath = `${projectPath}/${image.path}`;
        // Validate image exists before adding to CLI args
        if (existsSync(fullImagePath)) {
          cliArgs.push("--image", fullImagePath);
          validImages.push(image.filename);
        } else {
          // Log warning but continue with other images
          console.warn(`[Claude] Image not found, skipping: ${fullImagePath}`);
          missingImages.push(image.filename);
        }
      }

      // Send warning to client if any images were missing
      if (missingImages.length > 0) {
        this.sendToClient(client, {
          type: 'chat.warning',
          messageId,
          warning: `Einige Bilder konnten nicht geladen werden: ${missingImages.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      // Add user message as the last argument
      cliArgs.push(userMessage || 'Describe these images.');

      console.log('[Claude] Spawning CLI with images:', command, cliArgs.slice(0, 6).join(' '), '...');
      console.log('[Claude] Working directory:', session.projectPath);
      console.log('[Claude] Selected model:', `${providerId}/${modelId}`);
      console.log('[Claude] Valid images:', validImages.length, 'of', images.length);
      if (missingImages.length > 0) {
        console.log('[Claude] Missing images:', missingImages.join(', '));
      }

      // Remove ANTHROPIC_API_KEY to use Claude Max OAuth instead of API key auth
      const { ANTHROPIC_API_KEY: _removed2, ...envWithoutApiKey2 } = process.env;

      const claudeProcess = spawnWithLoginShell(command, cliArgs, {
        cwd: session.projectPath,
        env: { ...envWithoutApiKey2 },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      session.claudeProcess = claudeProcess;
      console.log('[Claude] Process spawned with PID:', claudeProcess.pid);

      // Close stdin immediately - Claude CLI doesn't need interactive input in --print mode
      claudeProcess.stdin?.end();

      let currentToolCall: ToolCall | null = null;
      let buffer = '';

      claudeProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        console.log('[Claude stdout]:', chunk.substring(0, 200));
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);
            console.log('[Claude event]:', event.type);
            this.handleClaudeEvent(
              client,
              messageId,
              event,
              toolCalls,
              currentToolCall,
              onContent,
              (tc) => { currentToolCall = tc; }
            );
          } catch {
            // Non-JSON output, treat as plain text
            if (line.trim()) {
              onContent(line + '\n');
              this.sendToClient(client, {
                type: 'chat.stream',
                messageId,
                delta: line + '\n',
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      });

      claudeProcess.stderr?.on('data', (data: Buffer) => {
        const errorText = data.toString();
        console.error('[Claude CLI stderr]:', errorText);
        // Don't reject on stderr - Claude CLI uses it for status messages
      });

      claudeProcess.on('close', (code) => {
        console.log('[Claude] Process closed with code:', code);
        session.claudeProcess = undefined;
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            this.handleClaudeEvent(
              client,
              messageId,
              event,
              toolCalls,
              currentToolCall,
              onContent,
              (tc) => { currentToolCall = tc; }
            );
          } catch {
            if (buffer.trim()) {
              onContent(buffer);
              this.sendToClient(client, {
                type: 'chat.stream',
                messageId,
                delta: buffer,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Claude CLI exited with code ${code}`));
        }
      });

      claudeProcess.on('error', (error) => {
        console.error('[Claude] Process error:', error);
        session.claudeProcess = undefined;
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`Model nicht verfügbar: CLI-Befehl "${command}" nicht in PATH gefunden`));
        } else {
          reject(error);
        }
      });
    });
  }

  private handleClaudeEvent(
    client: WebSocketClient,
    messageId: string,
    event: Record<string, unknown>,
    toolCalls: ToolCall[],
    currentToolCall: ToolCall | null,
    onContent: (content: string) => void,
    setCurrentToolCall: (tc: ToolCall | null) => void
  ): void {
    const eventType = event.type as string;

    switch (eventType) {
      case 'system': {
        // System init event - ignore
        break;
      }

      case 'assistant': {
        // Claude CLI format: {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
        const message = event.message as Record<string, unknown> | undefined;
        if (message?.content && Array.isArray(message.content)) {
          for (const block of message.content as Array<Record<string, unknown>>) {
            if (block.type === 'text' && typeof block.text === 'string') {
              onContent(block.text);
              this.sendToClient(client, {
                type: 'chat.stream',
                messageId,
                delta: block.text,
                timestamp: new Date().toISOString()
              });
            } else if (block.type === 'tool_use') {
              // Tool call in assistant message
              const toolCall: ToolCall = {
                id: (block.id as string) || crypto.randomUUID(),
                name: (block.name as string) || 'unknown',
                input: (block.input as Record<string, unknown>) || {},
                status: 'running'
              };
              toolCalls.push(toolCall);
              setCurrentToolCall(toolCall);

              this.sendToClient(client, {
                type: 'chat.tool',
                messageId,
                toolCall,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
        break;
      }

      case 'user': {
        // Tool result returned to Claude - mark tool as complete
        const message = event.message as Record<string, unknown> | undefined;
        if (message?.content && Array.isArray(message.content)) {
          for (const block of message.content as Array<Record<string, unknown>>) {
            if (block.type === 'tool_result' && currentToolCall) {
              currentToolCall.status = 'complete';
              currentToolCall.output = typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content);

              this.sendToClient(client, {
                type: 'chat.tool.complete',
                messageId,
                toolCall: currentToolCall,
                timestamp: new Date().toISOString()
              });
              setCurrentToolCall(null);
            }
          }
        }
        break;
      }

      case 'result': {
        // Final result - already sent via assistant events, no need to duplicate
        // Just ignore to avoid double-sending
        break;
      }

      case 'error': {
        // Error from Claude
        const errorMessage = (event.error as Record<string, unknown>)?.message || event.message || 'Unknown error';
        throw new Error(errorMessage as string);
      }
    }
  }

  public getHistory(clientId: string, projectPath: string): ChatMessage[] {
    const sessionId = `${clientId}-${projectPath}`;
    const session = this.sessions.get(sessionId);
    return session?.messages ?? [];
  }

  public clearHistory(clientId: string, projectPath: string): void {
    const sessionId = `${clientId}-${projectPath}`;
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
    }
  }

  public updateModelSettings(
    clientId: string,
    projectPath: string,
    providerId: string,
    modelId: string
  ): ModelSelection {
    const sessionId = this.getOrCreateSession(clientId, projectPath);
    const session = this.sessions.get(sessionId)!;
    session.selectedModel = { providerId, modelId };
    console.log(`[Claude] Model settings updated for session ${sessionId}: ${providerId}/${modelId}`);
    return session.selectedModel;
  }

  public getModelSettings(clientId: string, projectPath: string): ModelSelection {
    const sessionId = this.getOrCreateSession(clientId, projectPath);
    const session = this.sessions.get(sessionId)!;
    return session.selectedModel;
  }

  private sendToClient(client: WebSocketClient, message: Record<string, unknown>): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}
