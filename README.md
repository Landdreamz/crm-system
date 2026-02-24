# CRM System

Dashboard CRM with contacts, pipeline management (ACQ / Dispo), and calculators.

**Live app:** Deploy the frontend to [Vercel](https://vercel.com) in one click — see [docs/DEPLOY.md](docs/DEPLOY.md). (GitHub Pages: [https://landdreamz.github.io/crm-system/](https://landdreamz.github.io/crm-system/))

## Structure

- **frontend/** — React (TypeScript) dashboard: contacts, pipelines, calendar, settings, dark mode
- **backend/** — Django API

## Run locally

**Frontend**
```bash
cd frontend && npm install && npm start
```

**Backend**
```bash
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python manage.py runserver
```

## GitHub

After creating a new repository on GitHub (do not initialize with a README), run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/crm-system.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username and `crm-system` with your repo name if different.
