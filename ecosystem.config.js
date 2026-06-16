module.exports = {
  apps: [
    {
      name: "tuberank-dev",
      script: "cmd.exe",
      args: "/c npm run dev",
      cwd: __dirname
    },
    {
      name: "tuberank-worker",
      script: "cmd.exe",
      args: "/c npm run worker:ai",
      cwd: __dirname
    }
  ]
};
