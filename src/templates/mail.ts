export const mailWithOTP = (OTP: string): string => {
  return /* html */`
 <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Password Reset</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f5f5f5;
          }
          .card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            text-align: center;
          }
          button {
            margin-top: 1rem;
            padding: 0.7rem 1.2rem;
            border: none;
            background: #007bff;
            color: white;
            border-radius: 4px;
            cursor: pointer;
          }
          button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Confirm password reset</h1>
          <p>Click the button below to change your password.</p>

          <form method="POST" action="www.raglive.com/api/auth/forgotten-pass-step-2">
            <input type="hidden" name="otp" value="${OTP}" />
            <button type="submit">Confirm</button>
          </form>
        </div>
      </body>
    </html>
  `;
};