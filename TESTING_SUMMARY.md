# Test Coverage Summary

The remaining tests cover operational invoice, inventory, payroll, reports, and authentication flows. Accounting ledger tests and endpoints were removed with the Accounting feature.

## Payroll

- Payroll period and calculation behavior: `__tests__/lib/payroll-service.test.ts`
- Payroll API behavior: `__tests__/api/payroll.test.ts`
- Payroll dashboard and detail interactions: `__tests__/components/payroll-dashboard.test.tsx`, `__tests__/components/payroll-detail.test.tsx`
- Full payroll period workflow: `__tests__/integration/payroll-workflow.test.ts`

## Other coverage

- Salary slip PDF generation: `__tests__/lib/salary-slip-pdf.test.ts`
- Sidebar navigation: `__tests__/components/app-sidebar.test.tsx`
- Additional focused tests are organized under `__tests__/api`, `__tests__/lib`, and `__tests__/components`.

Run `npm run test:ci` to execute the test suite.
