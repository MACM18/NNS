# Configure SMTP email delivery

The app can send email through SMTP using environment variables. SMTP is selected when `EMAIL_PROVIDER=smtp`; if `EMAIL_PROVIDER` is omitted, a configured `SMTP_HOST` also selects SMTP. SMTP environment settings are used when there is no active saved email configuration or saved credentials cannot be decrypted.

Set these variables in Dokploy for the application service, then redeploy/restart it:

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM=your-verified-sender@example.com
EMAIL_FROM_NAME=NNS Enterprise
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

Use your mail provider's SMTP hostname and credentials. For port 465, set `SMTP_SECURE=true`. For port 587 with STARTTLS, set `SMTP_SECURE=false`. The sender address must be authorized by that mail provider. Keep credentials in Dokploy's environment settings; do not commit them to the repository.

After changing environment values, restart the app so the email configuration cache is cleared. Then use **Settings → Email → Send test email**. A monthly run whose sheet is already ready can use **Retry email only**; this sends the existing sheet link and does not create another sheet.
