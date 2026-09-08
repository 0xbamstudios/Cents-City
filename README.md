# Cents City

Cents City is a financial literacy game that teaches real-world money skills through progressive, life-simulation gameplay. You start as an 18-year-old with a high school diploma living with your parents and with $500 in savings, then work, budget, borrow, invest, and make life decisions on your way to financial independence. A demo environment is hosted [here](https://www.cents-city.com/).

## The Goal

**Retire with a net worth of at least $3,000,000.** That's the object of the game. Build your net worth through steady income, smart budgeting, good credit, home equity, and long-term investing — then hit the **Retire** button (on the Jobs page) once you reach the target. The younger you retire and the higher your net worth, the better your standing on the leaderboard stats. Your progress toward the goal is shown as a percentage next to the Retire button.

## How to Play

### Getting Started

1. Enter your name to begin. The game clock starts running immediately — each game-week passes every few seconds (adjustable with the speed controls).
2. Open the **Jobs** panel and apply for an entry-level job (e.g. Dishwasher at $15/hr). Your paycheck arrives weekly via direct deposit.
3. Use **Banking** to set your direct-deposit split between checking and savings, and to transfer funds.

### Progression

The game unlocks new capabilities as you hit savings milestones:

| Stage | Milestone | Unlocks |
|-------|-----------|---------|
| Getting Started | $0 | Minimum-wage jobs, checking/savings accounts, W-4 withholding |
| Independence | $2,000 saved | Move out into an apartment; manage rent and utilities |
| Credit Building | $5,000 saved | Open a credit card; start building a credit score |
| Mobility | $10,000 saved | Buy or lease a car; unlock higher-paying jobs |
| Career Growth | Level 7 job | Salaried roles with 401(k) and health benefits |
| Investing | $25,000 saved | Open a brokerage account; buy stocks and fund retirement |
| Life Milestones | Ongoing | Nicer housing, buy a home, and long-term wealth building toward the $3M retirement goal |

### Core Mechanics

- **Jobs** — Choose hourly or salaried work. Hourly jobs can be stacked part-time (up to 90 hours/week), but working over 75 hours builds exhaustion. Many roles offer promotions after time in position. Salaried roles and select hourly jobs provide health insurance and a 401(k). Leaving a job requires giving two weeks' notice; accepting a promotion does not.
- **Banking** — Manage checking and savings, set your automatic savings rate, and watch interest accrue.
- **Credit** — Open and close credit cards, make payments, and track your credit score across the five factors that drive it. As your score rises, banks raise your limits. Interest is only charged on balances carried past their statement date.
- **Utilities & Expenses** — Pay recurring bills (rent, electric, water, insurance) and decide which credit card (or checking) covers each category of daily spending.
- **Housing & Transportation** — Rent an apartment, upgrade to a nicer one, or buy a home with a mortgage. Homes appreciate over time. Get around by public transit, a leased car, or a purchased vehicle, and sell or trade in when you upgrade.
- **Taxes** — Fill out your W-4 to set withholding, then file an annual return. The detailed filing view breaks down deductions, capital gains, and any underpayment penalties.
- **Investing** — Buy stocks by share count or dollar amount, funded from checking or savings. Track cost basis per lot with short- and long-term capital gains treatment. Contribute to a 401(k), Roth IRA, or Traditional IRA, and roll a 401(k) into an IRA after leaving a job.
- **Hobbies** — Take up activities that cost money but build skills, giving you an edge when applying for better jobs.
- **Life Events** — Random events (parking tickets, car repairs, identity theft, a friend asking for a loan) test your budgeting and emergency planning.

### Skills and Career

As you work and pursue hobbies, you build hidden skills (customer service, financial acumen, leadership, technical, and more). These skills gate access to higher-paying jobs and richer career paths. Track your progress on the Dashboard and sidebar.

### Settings

Toggle automation to match how hands-on you want to be: automated bill pay, automated tax filing, and automated credit-card payment. Turn them off to manage everything manually — and learn what happens when a payment is missed.

## Architecture

Cents City is built as a **frontend** and a **backend**.

### Frontend

The frontend is a Single Page Application (SPA) developed in **React** with **TypeScript**. It contains the full game engine (finance, taxes, credit, investing, skills, jobs, and progression logic) as a portable, view-agnostic layer, with React components for the user interface. The app is responsive and adapts to narrow screens such as an iPhone, including a collapsible navigation sidebar.

Local development:

```bash
cd react
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

### Backend

The backend provides an API to track the number of game plays and other statistics. It is deployed with the AWS CDK (in the `CDK` folder) and consists of:

- An **API Gateway** REST API with a Lambda-backed integration. A `PUT` request increments a play counter each time a game is started, and a `GET` request returns the current count.
- A **DynamoDB** table that stores the counter and related statistics.
- A private **S3** bucket that hosts the built React application.
- A **CloudFront** distribution that serves the SPA and routes `/api/*` traffic to API Gateway, fronted by the `www.cents-city.com` domain.

### Deployment

These commands can be used when deploying the infrastructure to host the backend and frontend on Amazon Web Services (AWS):

```bash
cd CDK
npm install
npx cdk deploy
```
