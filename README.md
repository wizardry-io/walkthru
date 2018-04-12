# Walkthru

Makes sure your step by step code walkthough works.

## Motivation

This is part of a set of tools designed to verify that code walkthroughs work correctly. The need arised when I wrote a step by step code walkthrough. I created the instructions based on a finished repository, but it was hard to verify that all the steps worked correctly. I could also have missed some steps, but I would need to follow all instructions step by step to make sure they work fine.

Walkthru solves this problem. It lets you verify that all steps in a markdown file work correctly. It transforms shell commands and code snippets from a markdown file into a shell script. To verify that your walkthrough is correct, you just need to run `walkthru input.md output.sh` and run the generated shell script.

Note that by itself, walkthru is just a tool that generates a shell script based on commands in a markdown file. It's entirely up to you to write the commands in a way that lets you verify that they work correctly. I recommend that you run your script in a Docker container so that it starts from scratch every time. You can see an example in `fixtures` folder. To try it out, run `./shell.sh` to start a shell session in the container. Then run `./walkthrough.sh` inside it, wait for it to finish, and finally go to `http://localhost:3000`. You should see the final step of the walkthrugh working.

## Installation

`yarn global add walkthru` or `npm install -g walkthru`

## Usage

```bash
walkthru input.md output.sh
```
