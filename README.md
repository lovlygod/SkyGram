# ☁️ SkyGram - Personal Cloud Storage

SkyGram is a personal cloud storage application that uses Telegram as a drive. It allows you to upload, download, and organize your files using the Telegram API. The project is built using [Next.js](https://nextjs.org) and [Gramjs](https://gram.js.org).

✨ The project is actively under development, expect frequent updates and new features.

![banner](https://github.com/lovlygod/SkyGram/assets/31907722/2689dbab-c78f-4bfa-b15b-76cee9f95484)

Run on your local machine without any external dependencies. You just need to create a Telegram application and get the API ID and API Hash from [my.telegram.org](https://my.telegram.org).

It uses SQLite as a database to store user data and files. You can run the project using Docker or on your local machine.

## Features

- ✨ Clean UI
- 📁 Organize your content
- 📤 Upload/download files
- 🔖 Bookmark files
- 🗑️ Move to trash
- 📱 Multiple accounts
- ✅ Select multiple files at once
- 🔄 Perform batch operations (delete, move, bookmark)

## Roadmap

- [ ] Search files
- [ ] Link Google Drive
- [ ] Generate shareable link
- [ ] Custom chat for uploading files

## 🚀 Installation

Right now, you can run the project locally by following the steps below. It uses SQLite as a database.

### Docker

Use the following commands to run the project using Docker.

```bash
docker run -d -p 3000:3000 \
  -e TELEGRAM_API_ID='' \
  -e TELEGRAM_API_HASH='' \
  -e SERVER_URL='http://localhost:3000' \
  ghcr.io/mxvsh/SkyGram:latest
```

### Local Development

1. Clone the repository

```bash
git clone https://github.com/lovlygod/SkyGram.git
```

2. Install dependencies

```bash
pnpm install
```

3. Setup environment variables

```bash
cp .env.example .env
```

4. Fill in the environment variables

```env
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
SERVER_URL=http://localhost:3000
```

5. Run the project

```bash
pnpm dev
```

## 📋 How to use

### Adding Account

1. Click on the "Add Account" button
2. Enter your phone number
3. Verify the code sent to your Telegram
4. You're ready to use the application

### File Operations

- Upload files by clicking the upload button
- Create folders to organize your files
- Move files between folders
- Bookmark important files for quick access
- Move files to trash when no longer needed

### Multiple File Selection and Batch Operations

SkyGram now supports selecting multiple files and performing batch operations:

#### Selecting Multiple Files

- **Single selection**: Click on a file to select it
- **Multiple selection**: Hold the `Ctrl` key (or `Cmd` on Mac) and click on multiple files to select them
- **Deselect**: Click on a selected file again to deselect it or use the "Cancel selection" button
- **Visual indicators**: Selected files show a checkmark in the top-right corner

#### Performing Batch Operations

Once you have selected multiple files, a toolbar will appear at the top with the following options:

- **Delete**: Move all selected files to trash
- **Move**: Move all selected files to another folder
- **Bookmark**: Add all selected files to bookmarks
- **Unbookmark**: Remove all selected files from bookmarks
- **Cancel selection**: Deselect all files

The batch operations are processed efficiently and updates are reflected in real-time in the UI.