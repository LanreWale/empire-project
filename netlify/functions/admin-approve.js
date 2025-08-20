// netlify/functions/admin-approve.js
"use strict";

const fetch = require("node-fetch");

exports.handler = async (event) => {
  const secret = process.env.ADMIN_SECRET || "changeme";

  // Enforce secret header
  if (event.headers["x-admin-secret"] !== secret) {
    return {
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const res = await fetch(`${process.env.URL}/.netlify/functions/approve-user`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Empire Approvals</title>
        <style>
          body { font-family: sans-serif; padding: 1rem; background: #f9fafb; }
          input, button { width: 100%; padding: .8rem; margin: .4rem 0; font-size: 1rem; }
          button { background: #2563eb; color: white; border: none; border-radius: .5rem; }
        </style>
      </head>
      <body>
        <h2>✅ Approve User</h2>
        <form id="f">
          <input name="name" placeholder="Full Name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="phone" placeholder="+234..." required />
          <label><input type="checkbox" name="approve" checked /> Approve</label>
          <button type="submit">Send Approval</button>
        </form>
        <pre id="out"></pre>
        <script>
          const f = document.getElementById("f");
          f.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(f);
            const data = Object.fromEntries(fd.entries());
            data.approve = fd.get("approve") === "on";
            const res = await fetch("", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-admin-secret": "${secret}"
              },
              body: JSON.stringify(data)
            });
            document.getElementById("out").textContent = await res.text();
          };
        </script>
      </body>
      </html>
    `,
  };
};