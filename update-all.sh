#!/bin/bash

# Specwright - Update All Files
# Updates both standards and workflows files in the current project

curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash -s -- --overwrite-workflows --overwrite-standards
