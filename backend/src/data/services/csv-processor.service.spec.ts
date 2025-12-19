import { Test, TestingModule } from '@nestjs/testing';
import { CsvProcessorService } from './csv-processor.service';

describe('CsvProcessorService', () => {
  let service: CsvProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvProcessorService],
    }).compile();

    service = module.get<CsvProcessorService>(CsvProcessorService);
  });

  it('should correctly validate a mix of valid and invalid rows', async () => {
    // ARRANGE: Create a mock CSV buffer with specific edge cases
    const csvContent = `name,email,age
Valid User,valid@test.com,30
,no-name@test.com,25
Invalid Date,date@test.com,not-a-date`;
    const buffer = Buffer.from(csvContent);

    // ACT: Run the processor
    const result = await service.processCsvFile(buffer, 'test.csv');

    // ASSERT: Check the granular results
    // QA mindset: Don't just check "success", check failure reasons
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(2); // First and third rows have names (critical column)
    expect(result.invalidRows).toBe(1); // Only second row missing name
    
    // Check specific error messages
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Missing required value for column 'name'"),
      ])
    );
  });
});