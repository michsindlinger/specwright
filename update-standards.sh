#!/bin/bash

# Specwright - Update Standards Only
# Updates only the standards files in the current project

curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash -s -- --overwrite-standards
