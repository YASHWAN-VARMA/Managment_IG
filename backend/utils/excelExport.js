const ExcelJS = require("exceljs");
const exportToExcel = async (res, sheetName, columns, rows, filename) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Fleet Management System";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns;
    worksheet.addRows(rows);
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E78" }
    };
    header.alignment = {
        vertical: "middle",
        horizontal: "center"
    };
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });
    });
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
        from: "A1",
        to: `${worksheet.getColumn(worksheet.columnCount).letter}1`
    };
    worksheet.columns.forEach((column) => {
        column.width = 22;
    });
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
};
const exportMultipleSheets = async (res, sheets, filename) => {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Fleet Management System";
    workbook.created = new Date();

    sheets.forEach(sheet => {
        const worksheet = workbook.addWorksheet(sheet.name);

        worksheet.columns = sheet.columns;
        worksheet.addRows(sheet.rows);

        const header = worksheet.getRow(1);
        header.font = {
            bold: true,
            color: { argb: "FFFFFFFF" }
        };

        header.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1F4E78" }
        };

        worksheet.views = [{ state: "frozen", ySplit: 1 }];

        worksheet.columns.forEach(column => {
            column.width = 22;
        });
    });

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
};
module.exports = {
    exportToExcel,
    exportMultipleSheets
};