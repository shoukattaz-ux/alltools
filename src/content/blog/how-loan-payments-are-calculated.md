---
title: "How Loan Payments Are Calculated (With Worked Example)"
description: "See the formula behind fixed-rate loan payments, how interest and principal change over time, and how term length changes the total cost of a loan."
date: "2026-11-11"
topic: "Calculators"
tools: ["loan-calculator", "percentage-calculator", "discount-calculator"]
readingMinutes: 6
---

*General information only, not financial advice. Your lender's figures and terms always take precedence.*

Many loans (car loans, personal loans, fixed-rate mortgages) use **amortisation**: you pay the same amount each month, but the split between interest and principal changes over time.

## The formula

For a fixed rate and equal monthly payments:

**Payment = P × r ÷ (1 − (1 + r)^−n)**

- **P** is the amount borrowed.
- **r** is the monthly rate: the annual rate divided by 12, as a decimal (6% → 0.06 ÷ 12 = 0.005).
- **n** is the number of monthly payments.

If the interest rate is 0%, the payment is simply P ÷ n.

## Worked example

Borrow 200,000 at 6% for 30 years (360 payments):

- r = 0.005, n = 360
- (1.005)^−360 ≈ 0.1660
- Payment = 200,000 × 0.005 ÷ (1 − 0.1660) ≈ **1,199.10 per month**
- Total paid = 1,199.10 × 360 ≈ 431,676
- Total interest ≈ **231,676**

You can reproduce this in the [Loan Calculator](/tools/loan-calculator/).

## Why early payments are mostly interest

Each month, interest is charged on the *remaining balance*. At the start, the balance is high, so most of the payment is interest. As the balance falls, the interest portion shrinks and more goes to principal. In the example above, the first payment includes 1,000 of interest (200,000 × 0.005) and only about 199 of principal.

## How term length changes the cost

A longer term lowers the monthly payment but raises the total interest, because you owe money for longer. For 25,000 at 7%:

| Term | Monthly payment (approx.) | Total interest (approx.) |
| --- | --- | --- |
| 3 years | 772 | 2,789 |
| 5 years | 495 | 4,702 |

Compare options in the calculator and weigh monthly affordability against total cost.

## What the simple formula leaves out

- **Fees and insurance** that raise the real cost.
- **Variable rates**, which change the payment over time.
- **Different compounding or daily interest** used by some lenders.
- **Extra repayments**, which reduce interest and shorten the term.
- **Taxes and other charges.**

Always ask the lender for the official figures, such as the annual percentage rate (APR) and a full repayment schedule, before committing.

## A quick sanity check with percentages

To see how much of the total repayment is interest, divide total interest by total payment. In the example, 231,676 ÷ 431,676 ≈ 53.7%. Use the [Percentage Calculator](/tools/percentage-calculator/) for such checks.

## FAQ

### What is the difference between interest rate and APR?

The APR is intended to include certain fees as well as interest, giving a fuller yearly cost. Definitions vary by country.

### Does the currency matter?

Not for the formula. The calculator's currency option only changes how numbers are displayed.

### What if I pay extra each month?

Extra payments reduce the balance faster and cut total interest. This calculator does not model them.
