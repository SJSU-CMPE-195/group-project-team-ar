# AisleVision

An Augmented Reality (AR) grocery assistant that uses computer vision and real-time path planning to help shoppers locate items and navigate grocery stores efficiently.

## Team

| Name | GitHub | Email |
|------|--------|-------|
| Jumana Ayoub | [@jumanaayoub1](https://github.com/jumanaayoub1) | jumana.ayoub@sjsu.edu |
| Joshua Pastores | [@jjpastores](https://github.com/jjpastores) | joshua.pastores@sjsu.edu |
| Toey Lui | [@toeyldev](https://github.com/toeyldev) | toey.lui@sjsu.edu |
| Bush Nguyen | [@bush-nguyen](https://github.com/bush-nguyen) | bush.nguyen@sjsu.edu |

**Advisor:** Jun Liu

---

## Problem Statement

Grocery shopping in large retail stores can be time-consuming, inefficient, and frustrating. Shoppers often struggle to locate items in complex store layouts, forget items and backtrack, and become distracted by store designs that encourage impulse buying.
These situations negatively affect many users, including busy shoppers, delivery drivers, families, people with cognitive challenges, and those on a budget. Improving navigation and item discovery inside stores can make shopping faster, easier, and more accessible.

## Solution

AisleVision is an AR grocery assistant that helps shoppers efficiently locate items and navigate stores. Using computer vision and real-time path planning, the system detects products and guides users through visual AR elements. This hands-free approach reduces the need to constantly check phones or store maps, making the shopping experience more efficient and accessible.

### Key Features

- **Item Detection**: Identifies and highlights target grocery items in the user's view.
- **Focus Mode**: Highlights relevant items while dimming or graying out surrounding products to reduce distractions.
- **Path Planning and Navigation**: Computes the most efficient route between items and guides users with AR directions.
- **Checklist**: Displays a shopping list in the user's view and automatically checks off items when they are detected.

---

## Demo

[Link to demo video or GIF]

**Live Demo:** [URL if deployed]

---

## Screenshots

| Feature | Screenshot |
|---------|------------|
| [Feature 1] | ![Screenshot](docs/screenshots/feature1.png) |
| [Feature 2] | ![Screenshot](docs/screenshots/feature2.png) |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Lens Studio, JavaScript |
| Backend | Python |
| Hardware | Snap Spectacles |
| Database | Snap Cloud|
| Deployment | Snap Spectacles / Lens Studio |

---

## Getting Started

### Prerequisites

- [Prerequisite 1] v.X.X+
- [Prerequisite 2] v.X.X+

### Installation

```bash
# Clone the repository
git clone https://github.com/[org]/[repo].git
cd [repo]

# Install dependencies
[install command]

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations (if applicable)
[migration command]
```

### Running Locally

```bash
# Development mode
[dev command]

# The app will be available at http://localhost:XXXX
```

### Running Tests

```bash
[test command]
```

---

## API Reference

<details>
<summary>Click to expand API endpoints</summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resource` | Get all resources |
| GET | `/api/resource/:id` | Get resource by ID |
| POST | `/api/resource` | Create new resource |
| PUT | `/api/resource/:id` | Update resource |
| DELETE | `/api/resource/:id` | Delete resource |

</details>

---

## Project Structure

```
.
├── [folder]/           # Description
├── src/                # Source code files
├── tests/              # Test files
├── docs/               # Documentation files
└── README.md
```

---

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Commit Messages

Use clear, descriptive commit messages:
- `Add user authentication endpoint`
- `Fix database connection timeout issue`
- `Update README with setup instructions`

---

## Acknowledgments

- [Resource/Library/Person]
- [Resource/Library/Person]

---

## License

This project is licensed under the <FILL IN> License - see the [LICENSE](LICENSE) file for details.

---

*CMPE 195A/B - Senior Design Project | San Jose State University | Spring 2026*
