// frontend/src/pages/Login.jsx
// Bedrock Lens — Login Page

import { useState } from "react";
import { signIn, completeNewPassword } from "../auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.challenge === "NEW_PASSWORD_REQUIRED") {
        setChallenge(result);
        setPassword("");
      } else {
        onLogin();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await completeNewPassword(challenge.email, newPassword, challenge.session);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>B</div>
        <h1 style={styles.title}>Bedrock Lens</h1>
        <p style={styles.subtitle}>Cost intelligence dashboard</p>

        {error && <div style={styles.error}>{error}</div>}

        {!challenge ? (
          <form onSubmit={handleSignIn}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNewPassword}>
            <p style={styles.challengeText}>
              Please set a new password to continue.
            </p>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              required
              minLength={8}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Setting password..." : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0B0E11",
  },
  card: {
    width: 360,
    padding: 40,
    background: "#12161C",
    borderRadius: 16,
    border: "1px solid #1E2530",
    textAlign: "center",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 700,
    color: "#0B0E11",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#E2E8F0",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: 14,
    color: "#556070",
    margin: "0 0 28px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    marginBottom: 12,
    borderRadius: 10,
    border: "1px solid #1E2530",
    background: "#0B0E11",
    color: "#E2E8F0",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px 16px",
    marginTop: 8,
    borderRadius: 10,
    border: "none",
    background: "#22D3EE",
    color: "#0B0E11",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    padding: "10px 14px",
    marginBottom: 16,
    borderRadius: 8,
    background: "rgba(248,113,113,0.12)",
    border: "1px solid rgba(248,113,113,0.2)",
    color: "#F87171",
    fontSize: 13,
  },
  challengeText: {
    fontSize: 13,
    color: "#8494A7",
    marginBottom: 16,
  },
};