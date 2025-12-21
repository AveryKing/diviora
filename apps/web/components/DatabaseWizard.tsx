import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Database, CheckCircle2, XCircle, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

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
  mssql: { port: "1433", icon: "🪟" },
  oracle: { port: "1521", icon: "🔴" },
};

interface DatabaseWizardProps {
  onBack?: () => void;
}

export function DatabaseWizard({ onBack }: DatabaseWizardProps) {
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const totalSteps = 3;
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

    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate random success/failure for demo
    const isSuccess = Math.random() > 0.3;

    if (isSuccess) {
      setConnectionStatus("success");
    } else {
      setConnectionStatus("error");
      setErrorMessage("Failed to connect: Connection timeout. Please check your credentials and network settings.");
    }
  };

  const canProceedToStep2 = config.type !== "";
  const canProceedToStep3 = config.name && config.host && config.port && config.database && config.username;

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="size-8 text-blue-600" />
          <div>
            <h1>Add Database Source</h1>
            <p className="text-muted-foreground">Connect your database to start integrating data</p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Step 1: Select Database Type */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Database Type</CardTitle>
            <CardDescription>Choose the type of database you want to connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MS SQL Server first, then others */}
              {(["mssql", "postgresql", "mysql", "mongodb", "oracle"] as const).map((dbType) => {
                const isDisabled = dbType !== "mssql";
                return (
                  <button
                    key={dbType}
                    onClick={() => !isDisabled && handleDatabaseTypeChange(dbType)}
                    disabled={isDisabled}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isDisabled
                        ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                        : "hover:border-blue-500 " + (config.type === dbType ? "border-blue-600 bg-blue-50" : "border-gray-200")
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{databaseDefaults[dbType].icon}</span>
                      <div>
                        <div className="capitalize">{dbType === "mssql" ? "MS SQL Server" : dbType === "mongodb" ? "MongoDB" : dbType}</div>
                        <div className="text-sm text-muted-foreground">Port {databaseDefaults[dbType].port}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
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

      {/* Step 2: Configure Connection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Connection</CardTitle>
            <CardDescription>Enter your database connection details</CardDescription>
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
                  placeholder="localhost or IP address"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  placeholder="5432"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="database">Database Name *</Label>
              <Input
                id="database"
                placeholder="e.g., my_database"
                value={config.database}
                onChange={(e) => setConfig({ ...config, database: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="Database username"
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Database password"
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
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

      {/* Step 3: Test Connection */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Connection</CardTitle>
            <CardDescription>Verify that your database connection is working</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database Type:</span>
                <span className="capitalize">{config.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connection Name:</span>
                <span>{config.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Host:</span>
                <span>{config.host}:{config.port}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database:</span>
                <span>{config.database}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Username:</span>
                <span>{config.username}</span>
              </div>
            </div>

            {connectionStatus === "idle" && (
              <Button onClick={handleTestConnection} className="w-full">
                Test Connection
              </Button>
            )}

            {connectionStatus === "testing" && (
              <div className="flex items-center justify-center gap-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                <Loader2 className="size-5 animate-spin text-blue-600" />
                <span>Testing connection...</span>
              </div>
            )}

            {connectionStatus === "success" && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="size-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  Connection successful! Your database is ready to use.
                </AlertDescription>
              </Alert>
            )}

            {connectionStatus === "error" && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="size-5 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 size-4" /> Back
              </Button>
              {connectionStatus === "success" && (
                <Button onClick={() => alert("Database source added successfully!")}>
                  Complete Setup
                </Button>
              )}
              {connectionStatus === "error" && (
                <Button variant="outline" onClick={handleTestConnection}>
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}