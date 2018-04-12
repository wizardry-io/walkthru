const fs = require("fs");
const promisify = require("pify");

const readFile = promisify(fs.readFile);

const markdownShellScript = require("./index");

test("Parses bash commands", async () => {
  const input = await readFile("./fixtures/bash.md", "utf8");
  const output = await readFile("./fixtures/bash.sh", "utf8");
  const result = await markdownShellScript(input);
  expect(result).toEqual(output);
});
test("Creates files from code blocks", async () => {
  const input = await readFile("./fixtures/code.md", "utf8");
  const output = await readFile("./fixtures/code.sh", "utf8");
  const result = await markdownShellScript(input);
  expect(result).toEqual(output);
});
test("Updates files from diff code blocks", async () => {
  const input = await readFile("./fixtures/diff.md", "utf8");
  const output = await readFile("./fixtures/diff.sh", "utf8");
  const result = await markdownShellScript(input);
  expect(result).toEqual(output);
});
test("Parses bash commands, code blocks and code diffs in the same file", async () => {
  const input = await readFile("./fixtures/all.md", "utf8");
  const output = await readFile("./fixtures/all.sh", "utf8");
  const result = await markdownShellScript(input);
  expect(result).toEqual(output);
});
test("Ignores code blocks without file name", async () => {
  const input = await readFile("./fixtures/code-without-filename.md", "utf8");
  const output = await readFile("./fixtures/code-without-filename.sh", "utf8");
  const result = await markdownShellScript(input);
  expect(result).toEqual(output);
});
