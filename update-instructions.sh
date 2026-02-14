#!/bin/bash

# Specwright - Update Workflows Only
# Updates only the workflow files in the current project

curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash -s -- --overwrite-workflows
