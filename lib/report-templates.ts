export interface DrumNumberReportData {
  no: number
  tpNumber: string
  pdw: number
  dw: number
  dwCus: number
  drumNumber: string
}

export interface MaterialBalanceReportData {
  no: number
  item: string
  openingBalance: number
  stockIssued: number
  wastage: number
  inHand: number
  materialUsed: number
  wipMaterial: number
}

export interface DailyMaterialBalanceReportData {
  itemName: string
  unit: string
  dailyBalances: {
    date: string
    previousBalance: number
    issued: number
    usage: number
    balanceReturn: number
  }[]
}

export interface NewConnectionReportData {
  no: number
  tpNumber: string
  configs: string
  rtom: string
  completeDate: string
  f1: number
  g1: number
  dwLh: number
  dwCh: number
  dwRt: number
  iwN: number
  cat5: number
  fac: number
  fiberRossette: number
  topBolt: number
  conduit: number
  casing: number
  poleDetails: string
}

export class ReportTemplates {
  static generateDrumNumberHTML(data: DrumNumberReportData[], month: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Drum Number Sheet</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              font-weight: bold;
            }
            .header p {
              margin: 5px 0;
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: center;
              font-size: 11px;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            .footer div {
              width: 45%;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DRUM NUMBER SHEET</h1>
            <p>Month: ${month}</p>
            <p>NNS Enterprise</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>NO</th>
                <th>TP Number</th>
                <th>PDW</th>
                <th>DW</th>
                <th>DW CUS</th>
                <th>DRUM NUMBER</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>
                  <td>${row.no}</td>
                  <td>${row.tpNumber}</td>
                  <td>${row.pdw}</td>
                  <td>${row.dw}</td>
                  <td>${row.dwCus}</td>
                  <td>${row.drumNumber}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <div>
              <p>Prepared by: _________________</p>
              <p>Date: _________________</p>
            </div>
            <div>
              <p>Checked by: _________________</p>
              <p>(with rubber stamp)</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  static generateMaterialBalanceHTML(
    data: MaterialBalanceReportData[],
    contractorName: string,
    area: string,
    month: string,
    year: number,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Material Balance Sheet</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              font-size: 11px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
            }
            .header h1 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
            }
            .header p {
              margin: 3px 0;
              font-size: 12px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 6px; 
              text-align: center;
              font-size: 10px;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold;
            }
            .item-name {
              text-align: left;
              padding-left: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MATERIAL BALANCE SHEET FOR NEW CONNECTION</h1>
            <p>CONTRACTOR NAME: ${contractorName}</p>
            <p>AREA: ${area}</p>
            <p>MONTH: ${month}</p>
            <p>YEAR: ${year}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Item</th>
                <th>Opening Balance</th>
                <th>Stock Issued</th>
                <th>Wastage</th>
                <th>In hand End of the month</th>
                <th>Material used for invoice</th>
                <th>Ending WIP Material</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>
                  <td>${row.no}</td>
                  <td class="item-name">${row.item}</td>
                  <td>${row.openingBalance}</td>
                  <td>${row.stockIssued}</td>
                  <td>${row.wastage}</td>
                  <td>${row.inHand}</td>
                  <td>${row.materialUsed}</td>
                  <td>${row.wipMaterial}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `
  }

  static generateDailyMaterialBalanceHTML(data: DailyMaterialBalanceReportData[], month: string): string {
    // Get all unique dates from the data
    const allDates = data.length > 0 ? data[0].dailyBalances.map((d) => d.date) : []

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Daily Material Balance</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 10px;
              font-size: 8px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .header h1 {
              margin: 0;
              font-size: 14px;
              font-weight: bold;
            }
            .header p {
              margin: 3px 0;
              font-size: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 2px; 
              text-align: center;
              font-size: 7px;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold;
            }
            .item-name {
              text-align: left;
              padding-left: 4px;
              min-width: 120px;
            }
            .rotate {
              writing-mode: vertical-lr;
              text-orientation: mixed;
              min-width: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>NNS Enterprise - Daily Material Balance</h1>
            <p>Month: ${month}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th rowspan="2" class="item-name">Item Name</th>
                <th rowspan="2">Unit</th>
                ${allDates.map((date) => `<th colspan="4">Date: ${date}</th>`).join("")}
              </tr>
              <tr>
                ${allDates
                  .map(
                    () => `
                  <th>Previous Day balance</th>
                  <th>Issued</th>
                  <th>Usage</th>
                  <th>Balance Return</th>
                `,
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (item) => `
                <tr>
                  <td class="item-name">${item.itemName}</td>
                  <td>${item.unit}</td>
                  ${item.dailyBalances
                    .map(
                      (day) => `
                    <td>${day.previousBalance}</td>
                    <td>${day.issued}</td>
                    <td>${day.usage}</td>
                    <td>${day.balanceReturn}</td>
                  `,
                    )
                    .join("")}
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `
  }

  static generateNewConnectionHTML(
    data: NewConnectionReportData[],
    contractorName: string,
    invoiceNo: string,
    totals: any,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>FTTH New Connection Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 15px;
              font-size: 9px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
            }
            .header h1 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
            }
            .header p {
              margin: 3px 0;
              font-size: 11px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 3px; 
              text-align: center;
              font-size: 8px;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold;
            }
            .total-row {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
            }
            .footer div {
              width: 45%;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FTTH - (PH/HR)</h1>
            <p>Contractor Name: ${contractorName}</p>
            <p>Invoice No: ${invoiceNo}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>TP Number</th>
                <th>Configs</th>
                <th>RTOM</th>
                <th>Complete Date</th>
                <th>F-1</th>
                <th>G-1</th>
                <th>DW-LH</th>
                <th>DW-CH</th>
                <th>DW-RT</th>
                <th>IW-N</th>
                <th>Cat 5</th>
                <th>FAC</th>
                <th>Fiber Rossette</th>
                <th>Top Bolt</th>
                <th>Conduit</th>
                <th>Casing</th>
                <th>Pole Details & Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>
                  <td>${row.no}</td>
                  <td>${row.tpNumber}</td>
                  <td>${row.configs}</td>
                  <td>${row.rtom}</td>
                  <td>${row.completeDate}</td>
                  <td>${row.f1}</td>
                  <td>${row.g1}</td>
                  <td>${row.dwLh}</td>
                  <td>${row.dwCh}</td>
                  <td>${row.dwRt}</td>
                  <td>${row.iwN}</td>
                  <td>${row.cat5}</td>
                  <td>${row.fac}</td>
                  <td>${row.fiberRossette}</td>
                  <td>${row.topBolt}</td>
                  <td>${row.conduit}</td>
                  <td>${row.casing}</td>
                  <td>${row.poleDetails}</td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total-row">
                <td colspan="5">Material Total</td>
                <td>${totals.f1}</td>
                <td>${totals.g1}</td>
                <td>${totals.dwLh}</td>
                <td>${totals.dwCh}</td>
                <td>${totals.dwRt}</td>
                <td>${totals.iwN}</td>
                <td>${totals.cat5}</td>
                <td>${totals.fac}</td>
                <td>${totals.fiberRossette}</td>
                <td>${totals.topBolt}</td>
                <td>${totals.conduit}</td>
                <td>${totals.casing}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <div>
              <p>Prepared by: _________________</p>
            </div>
            <div>
              <p>Checked by: _________________</p>
              <p>(with rubber stamp)</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  static generateCSV(data: any[], headers: string[], title: string): string {
    const csvRows = [
      `# ${title}`,
      `# Generated on: ${new Date().toLocaleDateString()}`,
      "",
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] || ""
            return typeof value === "string" && value.includes(",") ? `"${value}"` : value
          })
          .join(","),
      ),
    ]
    return csvRows.join("\n")
  }

  static generateExcelData(data: any[], headers: string[], title: string) {
    return {
      title,
      headers,
      data,
      generatedAt: new Date().toISOString(),
    }
  }
}
