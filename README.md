# Góc Tâm Thư

## Run

Run the server with Node.js:

```sh
node server.js
```

## Admin deletion

Deletion is disabled unless the server starts with `DELETE_ADMIN_TOKEN` set. Configure it as a Codespaces secret or another private environment variable, then restart the server. Do not commit the token or place it in frontend files. The browser asks for the token when an authorized person chooses to delete a letter.

The API also limits each client connection to 10 submissions per minute. Submissions require explicit consent because published letters are stored on the server and visible to website visitors.