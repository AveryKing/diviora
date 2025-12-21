import { Database, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface SourceTypeSelectorProps {
  onSelectType: (type: "database" | "csv") => void;
}

export function SourceTypeSelector({ onSelectType }: SourceTypeSelectorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1>Add Data Source</h1>
        <p className="text-muted-foreground">Choose the type of data source you want to connect</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Source Type</CardTitle>
          <CardDescription>Connect to a database or upload a CSV file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => onSelectType("database")}
              className="p-6 border-2 border-gray-200 rounded-lg text-left transition-all hover:border-blue-500 hover:bg-blue-50 group"
            >
              <Database className="size-12 text-blue-600 mb-4" />
              <h3 className="mb-2">Database</h3>
              <p className="text-sm text-muted-foreground">
                Connect to SQL databases like MS SQL Server, PostgreSQL, MySQL, and more
              </p>
            </button>

            <button
              onClick={() => onSelectType("csv")}
              className="p-6 border-2 border-gray-200 rounded-lg text-left transition-all hover:border-blue-500 hover:bg-blue-50 group"
            >
              <FileSpreadsheet className="size-12 text-green-600 mb-4" />
              <h3 className="mb-2">CSV File</h3>
              <p className="text-sm text-muted-foreground">
                Upload a CSV file to import data directly into your integration
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
