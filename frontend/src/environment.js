// React reads REACT_APP_* variables when the app starts/builds.
// Local development uses this project's backend by default.
const server = (
  process.env.REACT_APP_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export default server;
