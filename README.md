# 🏛️ Church Billing App

A full-stack **Point-of-Sale (POS) and billing management system** built for church communities. Manage family records, products/inventory, process transactions with cash or UPI payments, and track sales analytics — all from a clean, mobile-friendly interface.

## Tech Stack

| Layer     | Technology                                       |
|-----------|--------------------------------------------------|
| Backend   | Django 6.0 + Django REST Framework               |
| Frontend  | Vanilla HTML/CSS/JS (PWA-enabled)                |
| Database  | SQLite (default) — easily swappable to PostgreSQL|
| PDF       | ReportLab                                        |
| Auth      | Django session-based authentication              |

## Features

- **POS Terminal** — Add products to cart, select a family, choose cash/UPI, and complete bills
- **UPI QR Code** — Auto-generates UPI payment QR codes for customer scanning
- **Family Management** — Register and search families by ward
- **Inventory Management** — Track product stock, prices, and images
- **Sales History** — Filter and search past invoices with PDF/WhatsApp sharing
- **Analytics Dashboard** — Revenue trends, ward-wise analysis, top products/families
- **PDF Receipts** — Professionally styled invoice PDFs via ReportLab
- **WhatsApp Integration** — One-click bill summary sharing via WhatsApp
- **PWA Support** — Installable as a Progressive Web App on mobile

## Project Structure

```
Billing App/
├── billing/              # Django app — models, views, serializers, utilities
│   ├── models.py         # Ward, Family, Product, Invoice, StoreSettings
│   ├── views.py          # REST API ViewSets + Auth views
│   ├── serializers.py    # DRF serializers with validation
│   ├── urls.py           # API routing
│   ├── utils.py          # PDF generation, WhatsApp link builder
│   └── report_utils.py   # Analytics report PDF generation
├── church_billing/       # Django project settings
│   ├── settings.py       # Configuration (uses .env via python-decouple)
│   └── urls.py           # Root URL configuration
├── frontend/             # Static frontend files
│   ├── index.html        # Dashboard
│   ├── pos.html          # POS Terminal
│   ├── sales.html        # Sales History
│   ├── analytics.html    # Analytics Dashboard
│   ├── families.html     # Family Management
│   ├── inventory.html    # Inventory Management
│   ├── login.html        # Login Page
│   ├── css/              # Stylesheets
│   └── js/               # JavaScript (api.js, auth.js, pos.js, etc.)
├── scripts/              # Utility scripts
│   ├── seed.py           # Database seeding with sample data
│   └── setup_admin.py    # Admin user creation/reset
├── .env                  # Environment variables (not committed to Git)
├── requirements.txt      # Python dependencies
└── manage.py             # Django management commands
```

## Setup Instructions

### 1. Clone and navigate

```bash
git clone <your-repo-url>
cd "Billing App"
```

### 2. Create virtual environment

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

Copy `.env.example` or create a `.env` file in the project root:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=*
```

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Create admin user

```bash
python scripts/setup_admin.py
```

Default credentials: `admin` / `admin123`

### 7. (Optional) Seed sample data

```bash
python scripts/seed.py
```

### 8. Start the server

```bash
python manage.py runserver
```

Visit [http://localhost:8000](http://localhost:8000) 🎉

## Available Scripts

| Script                      | Description                                     |
|-----------------------------|-------------------------------------------------|
| `python scripts/seed.py`         | Seeds the database with sample wards, families, products, and invoices |
| `python scripts/setup_admin.py`  | Creates or resets the admin superuser            |

## API Endpoints

All API endpoints are prefixed with `/api/` and require session authentication.

| Endpoint               | Description                        |
|------------------------|------------------------------------|
| `/api/wards/`          | CRUD for wards                     |
| `/api/families/`       | CRUD for families (with search)    |
| `/api/products/`       | CRUD for products                  |
| `/api/invoices/`       | CRUD for invoices + PDF/WhatsApp   |
| `/api/analytics/`      | Revenue, ward, product, family analytics |
| `/api/auth/login/`     | Session login                      |
| `/api/auth/logout/`    | Session logout                     |
| `/api/settings/`       | Store settings (UPI ID, merchant name) |

## License

This project is for internal church community use.
