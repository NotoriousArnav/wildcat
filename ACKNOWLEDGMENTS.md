# Acknowledgments

This project would not be possible without the excellent work of the open-source community. We acknowledge and are grateful to the following projects and their contributors:

## Core Dependencies

### @whiskeysockets/baileys
**Purpose:** WhatsApp Web API implementation  
**License:** MIT  
**Repository:** https://github.com/WhiskeySockets/Baileys  
**Description:** The core library that enables WhatsApp connectivity through reverse-engineered protocols. This project relies heavily on Baileys for all WhatsApp communication functionality.

### mongo-baileys
**Purpose:** MongoDB authentication state storage for Baileys  
**License:** MIT  
**Repository:** https://github.com/hacxk/mongo-baileys  
**Author:** HACXK  
**Description:** Provides MongoDB-based session persistence for Baileys. Our `mongoAuthState.js` file contains adapted code from this package with modifications for our specific use case.

### Express
**Purpose:** Web application framework  
**License:** MIT  
**Repository:** https://github.com/expressjs/express  
**Description:** Powers the HTTP REST API endpoints and routing infrastructure.

### MongoDB Node.js Driver
**Purpose:** Database connectivity  
**License:** Apache-2.0  
**Repository:** https://github.com/mongodb/node-mongodb-native  
**Description:** Provides robust MongoDB database operations for account management, auth state storage, and media handling via GridFS.

## Additional Dependencies

### qrcode-terminal
**Purpose:** QR code generation for terminal  
**License:** Apache-2.0  
**Repository:** https://github.com/gtanner/qrcode-terminal  
**Description:** Enables QR code display in the terminal for WhatsApp account pairing.

### Multer
**Purpose:** Multipart form-data handling  
**License:** MIT  
**Repository:** https://github.com/expressjs/multer  
**Description:** Handles file uploads for media message functionality.

### Axios
**Purpose:** HTTP client for webhook delivery  
**License:** MIT  
**Repository:** https://github.com/axios/axios  
**Description:** Used for reliable webhook delivery to external services.



### @hapi/boom
**Purpose:** HTTP error objects  
**License:** BSD-3-Clause  
**Repository:** https://github.com/hapijs/boom  
**Description:** Used for handling Baileys connection errors gracefully.

### link-preview-js
**Purpose:** URL preview generation  
**License:** MIT  
**Repository:** https://github.com/ospfranco/link-preview-js  
**Description:** Generates link previews for URLs shared in messages.

### uuid
**Purpose:** UUID generation  
**License:** MIT  
**Repository:** https://github.com/uuidjs/uuid  
**Description:** Generates unique identifiers for various operations.

### dotenv
**Purpose:** Environment variable management  
**License:** BSD-2-Clause  
**Repository:** https://github.com/motdotla/dotenv  
**Description:** Loads environment variables from .env files for configuration.

## Development Tools

### CodeRabbit
**Purpose:** AI-powered code review  
**Website:** https://coderabbit.ai  
**Description:** Automated PR reviews and code quality suggestions for this project.

## Special Thanks

- **WhatsApp** - For creating an amazing messaging platform (even though this is an unofficial implementation)
- **The Baileys community** - For maintaining and improving the reverse-engineered WhatsApp Web protocol
- **All npm package maintainers** - For creating and maintaining the tools we depend on
- **Our contributors** - Everyone who has contributed code, bug reports, or suggestions

## License Compatibility

This project is licensed under **GPL-3.0-only**. All dependencies used are compatible with GPL-3.0:

- MIT License: Compatible with GPL-3.0 (more permissive)
- Apache-2.0 License: Compatible with GPL-3.0
- BSD-2-Clause/BSD-3-Clause: Compatible with GPL-3.0 (more permissive)

For the complete dependency tree and versions, see `package.json`.

## Modified Code Notice

The file `mongoAuthState.js` contains code adapted from the `mongo-baileys` package (MIT licensed). The original copyright notice and MIT license text are preserved in the file header. Modifications include:
- Simplified implementation for specific use case
- Removed TypeScript-specific features
- Modified BufferJSON handling
- Adjusted storage keys and structure

---

If you believe any attribution is missing or incorrect, please open an issue or submit a pull request.
