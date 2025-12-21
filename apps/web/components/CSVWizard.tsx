import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { FileSpreadsheet, Upload, CheckCircle2, XCircle, ChevronRight, ChevronLeft, File, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface CSVWizardProps {
  onBack?: () => void;
}

export function CSVWizard({ onBack }: CSVWizardProps) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setFileName(file.name);

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setUploadError("Please upload a valid CSV file");
      setCsvData(null);
      return;
    }

    // Read and parse CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          setUploadError("CSV file is empty");
          setCsvData(null);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 6).map(line => 
          line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        );

        setCsvData({ headers, rows });
        setSelectedHeaders(headers); // Select all by default
        
        // Auto-generate source name from filename
        if (!sourceName) {
          const nameWithoutExt = file.name.replace('.csv', '');
          setSourceName(nameWithoutExt.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
      } catch (error) {
        setUploadError("Failed to parse CSV file");
        setCsvData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleHeaderToggle = (header: string) => {
    setSelectedHeaders(prev =>
      prev.includes(header)
        ? prev.filter(h => h !== header)
        : [...prev, header]
    );
  };

  const canProceedToStep2 = csvData !== null && !uploadError;
  const canProceedToStep3 = sourceName.trim() !== "" && selectedHeaders.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="size-8 text-green-600" />
          <div>
            <h1>Upload CSV File</h1>
            <p className="text-muted-foreground">Import data from a CSV file</p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Step 1: Upload File */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Select a CSV file from your computer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">CSV files only (max 50MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {fileName && !uploadError && (
              <Alert className="border-blue-200 bg-blue-50">
                <File className="size-5 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>{fileName}</strong> uploaded successfully
                </AlertDescription>
              </Alert>
            )}

            {uploadError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="size-5 text-red-600" />
                <AlertDescription className="text-red-800">
                  {uploadError}
                </AlertDescription>
              </Alert>
            )}

            {csvData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm mb-2"><strong>Preview:</strong></p>
                <div className="text-sm text-muted-foreground">
                  <p>• {csvData.headers.length} columns detected</p>
                  <p>• {csvData.rows.length}+ rows found</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  <ChevronLeft className="mr-2 size-4" /> Back to Source Selection
                </Button>
              )}
              <Button onClick={() => setStep(2)} disabled={!canProceedToStep2} className={!onBack ? "ml-auto" : ""}>
                Next <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure Import */}
      {step === 2 && csvData && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Import</CardTitle>
            <CardDescription>Review your data and select columns to import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sourceName">Source Name *</Label>
              <Input
                id="sourceName"
                placeholder="e.g., Sales Data 2024"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Preview</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Import</TableHead>
                        {csvData.headers.map((header, idx) => (
                          <TableHead key={idx}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-gray-50">
                        <TableCell></TableCell>
                        {csvData.headers.map((header, idx) => (
                          <TableCell key={idx}>
                            <Checkbox
                              checked={selectedHeaders.includes(header)}
                              onCheckedChange={() => handleHeaderToggle(header)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                      {csvData.rows.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          <TableCell className="text-muted-foreground">{rowIdx + 1}</TableCell>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx} className={!selectedHeaders.includes(csvData.headers[cellIdx]) ? "opacity-30" : ""}>
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedHeaders.length} of {csvData.headers.length} columns selected
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 size-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedToStep3}>
                Next <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm Import */}
      {step === 3 && csvData && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Import</CardTitle>
            <CardDescription>Review your import settings before proceeding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source Type:</span>
                <span>CSV File</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source Name:</span>
                <span>{sourceName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File Name:</span>
                <span>{fileName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Columns:</span>
                <span>{csvData.headers.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selected Columns:</span>
                <span>{selectedHeaders.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Selected Columns:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedHeaders.map((header, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="size-5 text-green-600" />
              <AlertDescription className="text-green-800">
                Your CSV file is ready to be imported. Click "Complete Import" to finish.
              </AlertDescription>
            </Alert>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 size-4" /> Back
              </Button>
              <Button onClick={() => alert("CSV file imported successfully!")}>
                Complete Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}