import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface CsvProcessingResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columns: string[];
  data: Record<string, any>[];
  errors: string[];
}

@Injectable()
export class CsvProcessorService {
  async processCsvFile(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<CsvProcessingResult> {
    const errors: string[] = [];
    let data: Record<string, any>[] = [];
    let columns: string[] = [];

    try {
      // Parse CSV with options
      const records = parse(fileBuffer, {
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle UTF-8 BOM
      });

      if (records.length === 0) {
        throw new Error('CSV file is empty or has no valid data rows');
      }

      // Get column names from first record
      columns = Object.keys(records[0] as Record<string, any>);

      // Validate and clean data
      const validatedData = this.validateAndCleanData(
        records as Record<string, any>[],
        columns,
        errors,
      );
      data = validatedData;

      return {
        totalRows: records.length,
        validRows: validatedData.length,
        invalidRows: records.length - validatedData.length,
        columns,
        data: validatedData,
        errors,
      };
    } catch (error) {
      errors.push(`CSV parsing error: ${error.message}`);
      return {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        columns: [],
        data: [],
        errors,
      };
    }
  }

  private validateAndCleanData(
    records: Record<string, any>[],
    columns: string[],
    errors: string[],
  ): Record<string, any>[] {
    const validData: Record<string, any>[] = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2; // +2 because index is 0-based and we skip header
      const cleanedRecord: Record<string, any> = {};
      let isValidRow = true;

      // Check for completely empty rows
      const hasData = Object.values(record).some(
        (value) =>
          value !== null && value !== undefined && String(value).trim() !== '',
      );

      if (!hasData) {
        errors.push(`Row ${rowNumber}: Empty row skipped`);
        return;
      }

      // Process each column
      columns.forEach((column) => {
        const value = record[column];

        // Clean the value
        const cleanedValue = this.cleanValue(value);
        cleanedRecord[column] = cleanedValue;

        // You can add specific validation rules here
        // For now, we'll just track if critical columns are missing
        if (
          this.isCriticalColumn(column) &&
          (cleanedValue === null || cleanedValue === '')
        ) {
          errors.push(
            `Row ${rowNumber}: Missing required value for column '${column}'`,
          );
          isValidRow = false;
        }
      });

      if (isValidRow) {
        // Add metadata to each record
        cleanedRecord._rowNumber = rowNumber;
        cleanedRecord._processedAt = new Date().toISOString();
        validData.push(cleanedRecord);
      }
    });

    return validData;
  }

  private cleanValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value).trim();

    if (stringValue === '') {
      return null;
    }

    // Try to convert to number if it looks like a number
    if (this.isNumeric(stringValue)) {
      const numValue = parseFloat(stringValue);
      return isNaN(numValue) ? stringValue : numValue;
    }

    // Try to convert to boolean
    if (stringValue.toLowerCase() === 'true') return true;
    if (stringValue.toLowerCase() === 'false') return false;

    // Try to convert to date (basic ISO date format)
    if (this.isISODate(stringValue)) {
      const date = new Date(stringValue);
      return isNaN(date.getTime()) ? stringValue : date.toISOString();
    }

    return stringValue;
  }

  private isNumeric(value: string): boolean {
    return /^-?\d*\.?\d+$/.test(value);
  }

  private isISODate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}/.test(value);
  }

  private isCriticalColumn(columnName: string): boolean {
    // Define which columns are considered critical
    // You can customize this based on your business rules
    const criticalColumns = ['id', 'name', 'email'];
    return criticalColumns.some((col) =>
      columnName.toLowerCase().includes(col.toLowerCase()),
    );
  }

  generateProcessingSummary(result: CsvProcessingResult): string {
    const lines = [
      `CSV Processing Summary:`,
      `- File processed successfully`,
      `- Total rows: ${result.totalRows}`,
      `- Valid rows: ${result.validRows}`,
      `- Invalid rows: ${result.invalidRows}`,
      `- Columns found: ${result.columns.length} (${result.columns.join(', ')})`,
    ];

    if (result.errors.length > 0) {
      lines.push(`- Errors encountered: ${result.errors.length}`);
      result.errors.slice(0, 10).forEach((error) => {
        lines.push(`  • ${error}`);
      });
      if (result.errors.length > 10) {
        lines.push(`  • ... and ${result.errors.length - 10} more errors`);
      }
    }

    return lines.join('\n');
  }
}
