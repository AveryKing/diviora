import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import {
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Table as TableIcon,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";

type DatabaseType = "postgresql" | "mysql" | "mongodb" | "mssql" | "oracle";

interface DatabaseConfig {
  type: DatabaseType | "";
  name: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

type ConnectionStatus = "idle" | "testing" | "success" | "error";

const databaseDefaults: Record<DatabaseType, { port: string; icon: string }> = {
  postgresql: { port: "5432", icon: "🐘" },
  mysql: { port: "3306", icon: "🐬" },
  mongodb: { port: "27017", icon: "🍃" },
  mssql: { port: "1433", icon: "🟦" },
  oracle: { port: "1521", icon: "🔴" },
};

interface DatabaseWizardProps {
  onBack?: () => void;
  // Updated signature: returns the list of tables on success
  onConnect?: (config: any) => Promise<string[]>;
  onComplete?: (table: string) => void;
}

export function DatabaseWizard({
  onBack,
  onConnect,
  onComplete,
}: DatabaseWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<DatabaseConfig>({
    type: "",
    name: "",
    host: "localhost",
    port: "",
    database: "",
    username: "",
    password: "",
  });
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const totalSteps = 4; // Increased to 4
  const progress = (step / totalSteps) * 100;

  const handleDatabaseTypeChange = (type: DatabaseType) => {
    setConfig({
      ...config,
      type,
      port: databaseDefaults[type].port,
    });
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    setErrorMessage("");

    try {
      if (onConnect) {
        const discoveredTables = await onConnect(config);
        setTables(discoveredTables);
        setConnectionStatus("success");
        // Auto-advance after short delay
        setTimeout(() => setStep(4), 1000);
      } else {
        // Mock for UI testing
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTables(["Users", "Orders", "Products", "AuditLogs"]);
        setConnectionStatus("success");
        setTimeout(() => setStep(4), 1000);
      }
    } catch (e) {
      setConnectionStatus("error");
      setErrorMessage(e?.message || (typeof e === 'string' ? e : 'Unknown error'));
    }
  };

  const canProceedToStep2 = config.type !== "";
  const canProceedToStep3 =
    config.name &&
    config.host &&
    config.port &&
    config.database &&
    config.username;

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="size-8 text-blue-600" />
          <div>
            <h1>Add Database Source</h1>
            <p className="text-muted-foreground">
              Connect your database to start integrating data
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>
            Step {step} of {totalSteps}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* STEP 1: Type Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Database Type</CardTitle>
            <CardDescription>
              Choose the type of database you want to connect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                ["mssql", "postgresql", "mysql", "mongodb", "oracle"] as const
              ).map((dbType) => {
                const isDisabled = dbType !== "mssql";
                return (
                  <button
                    key={dbType}
                    onClick={() =>
                      !isDisabled && handleDatabaseTypeChange(dbType)
                    }
                    disabled={isDisabled}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isDisabled
                        ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                        : "hover:border-blue-500 " +
                          (config.type === dbType
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200")
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {databaseDefaults[dbType].icon}
                      </span>
                      <div>
                        <div className="capitalize">
                          {dbType === "mssql" ? "MS SQL Server" : dbType}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Port {databaseDefaults[dbType].port}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between pt-4">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  <ChevronLeft className="mr-2 size-4" /> Back
                </Button>
              )}
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className={!onBack ? "ml-auto" : ""}
              >
                Next <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Configuration */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Connection</CardTitle>
            <CardDescription>
              Enter your database connection details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Production Database"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host *</Label>
                <Input
                  id="host"
                  placeholder="localhost or IP"
                  value={config.host}
                  onChange={(e) =>
                    setConfig({ ...config, host: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  placeholder="1433"
                  value={config.port}
                  onChange={(e) =>
                    setConfig({ ...config, port: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="database">Database Name *</Label>
              <Input
                id="database"
                placeholder="e.g., SalesDB"
                value={config.database}
                onChange={(e) =>
                  setConfig({ ...config, database: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={config.username}
                  onChange={(e) =>
                    setConfig({ ...config, username: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={config.password}
                  onChange={(e) =>
                    setConfig({ ...config, password: e.target.value })
                  }
                />
              </div>
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

      {/* STEP 3: Test Connection */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Connection</CardTitle>
            <CardDescription>Verify your settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host:</span>
                <span className="font-medium">{config.host}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database:</span>
                <span className="font-medium">{config.database}</span>
              </div>
            </div>

            {connectionStatus === "idle" && (
              <Button onClick={handleTestConnection} className="w-full">
                Connect & Discover Tables
              </Button>
            )}

            {connectionStatus === "testing" && (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Loader2 className="size-8 animate-spin text-blue-600" />
                <p className="text-sm text-muted-foreground">
                  Connecting to database...
                </p>
              </div>
            )}

            {connectionStatus === "success" && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-green-600">
                <CheckCircle2 className="size-8" />
                <p className="font-medium">Success! Redirecting...</p>
              </div>
            )}

            {connectionStatus === "error" && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="size-5 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
            )}

            {connectionStatus === "error" && (
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleTestConnection}>Retry</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Table Selection */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Table</CardTitle>
            <CardDescription>
              We found {tables.length} tables. Choose one to ingest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-72 w-full rounded-md border p-4">
              <div className="space-y-2">
                {tables.map((table) => (
                  <div
                    key={table}
                    onClick={() => setSelectedTable(table)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all ${
                      selectedTable === table
                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                        : "hover:bg-muted border-transparent"
                    }`}
                  >
                    <TableIcon className="size-4 mr-3 text-muted-foreground" />
                    <span className="font-medium">{table}</span>
                    {selectedTable === table && (
                      <CheckCircle2 className="ml-auto size-4 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back to Config
              </Button>
              <Button
                onClick={() => selectedTable && onComplete?.(selectedTable)}
                disabled={!selectedTable}
                className="bg-green-600 hover:bg-green-700"
              >
                Start Ingestion <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
