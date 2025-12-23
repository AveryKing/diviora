"use client";

import {
  Layout,
  Menu,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Statistic,
  Tag,
  Tabs,
  Divider,
  Table,
  Button,
  Alert,
  Spin,
  Empty,
  Tooltip,
  Skeleton,
  Badge,
  Popconfirm,
  message,
  Drawer,
} from "antd";
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  SettingOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { IngestionDashboard } from "@/components/ingestion-dashboard";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: "overview", icon: <ApartmentOutlined />, label: "Overview" },
  { key: "pipelines", icon: <CloudUploadOutlined />, label: "Pipelines" },
  { key: "jobs", icon: <ThunderboltOutlined />, label: "Jobs" },
  { key: "settings", icon: <SettingOutlined />, label: "Settings" },
  { key: "dev", icon: <AlertOutlined />, label: "Dev" },
];

export function AntDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [pipelinesError, setPipelinesError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [wiping, setWiping] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [dataDrawerOpen, setDataDrawerOpen] = useState(false);
  const [dataDrawerJobId, setDataDrawerJobId] = useState<number | null>(null);
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataPage, setDataPage] = useState(1);
  const [dataTotal, setDataTotal] = useState(0);
  const dataPageSize = 50;

  const fetchPipelines = async () => {
    setPipelinesLoading(true);
    setPipelinesError(null);
    try {
      const data = await api.get<any[]>("ingestion/data-sources");
      setPipelines(data || []);
    } catch (err) {
      setPipelinesError((err as Error).message);
    } finally {
      setPipelinesLoading(false);
    }
  };

  const fetchJobs = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const data = await api.get<any[]>("ingestion/data-sources");
      const allJobs = (data || []).flatMap((ds: any) =>
        (ds.ingestionJobs || []).map((job: any) => ({
          ...job,
          dataSourceName: ds.name,
        }))
      );
      setJobs(allJobs);
    } catch (err) {
      setJobsError((err as Error).message);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
    fetchJobs();
    const interval = setInterval(() => {
      fetchJobs();
      fetchPipelines();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const pipelineRows = useMemo(
    () =>
      pipelines.map((p) => {
        const latestJob = (p.ingestionJobs || [])[0];
        return {
          key: p.id,
          name: p.name,
          type: p.type,
          createdAt: p.createdAt,
          jobsCount: (p.ingestionJobs || []).length,
          latestStatus: latestJob?.status,
          latestJobId: latestJob?.id,
        };
      }),
    [pipelines]
  );

  const jobRows = useMemo(
    () =>
      jobs
        .map((j) => ({
          key: j.id,
          id: j.id,
          source: j.dataSourceName,
          status: j.status,
          createdAt: j.createdAt,
          startedAt: j.startedAt,
          completedAt: j.completedAt,
          errorMessage: j.errorMessage,
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        ),
    [jobs]
  );

  const stats = useMemo(() => {
    const running = jobs.filter((j) => j.status === "processing").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    return {
      sources: pipelines.length,
      pipelines: pipelines.length,
      running,
      alerts: failed,
      completed,
    };
  }, [jobs, pipelines]);

  const statusTag = (status?: string) => {
    switch (status) {
      case "completed":
        return <Tag color="green">Completed</Tag>;
      case "processing":
        return <Tag color="blue">Processing</Tag>;
      case "queued":
        return <Tag color="orange">Queued</Tag>;
      case "failed":
        return <Tag color="red">Failed</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  const triggerPipeline = async (record: any) => {
    try {
      await api.post(`ingestion/trigger/${record.key}`, {});
      fetchJobs();
    } catch (err) {
      setJobsError((err as Error).message);
    }
  };

  const openWizard = () => {
    setWizardKey((k) => k + 1);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    fetchPipelines();
  };

  const wipeDatabase = async () => {
    setWiping(true);
    try {
      await api.post("dev/wipe-all", {});
      message.success("All data erased (dev)");
      fetchPipelines();
      fetchJobs();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setWiping(false);
    }
  };

  const loadJobData = async (jobId: number, page = 1) => {
    setDataLoading(true);
    setDataError(null);
    try {
      const res = await api.get<{ data: any[]; pagination: { total: number } }>(
        `ingestion/processed-data/${jobId}?page=${page}&limit=${dataPageSize}`
      );
      setDataRows(res.data || []);
      setDataTotal(res.pagination?.total || 0);
      setDataPage(page);
    } catch (err) {
      setDataError((err as Error).message);
    } finally {
      setDataLoading(false);
    }
  };

  const openJobDataDrawer = (jobId: number) => {
    setDataDrawerJobId(jobId);
    setDataDrawerOpen(true);
    loadJobData(jobId, 1);
  };

  const closeJobDataDrawer = () => {
    setDataDrawerOpen(false);
    setDataDrawerJobId(null);
    setDataRows([]);
    setDataTotal(0);
    setDataPage(1);
    setDataError(null);
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{ background: "#ffffff", borderRight: "1px solid #e5e7eb" }}
      >
        <div
          style={{
            padding: "20px 16px",
            color: "#111827",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: 0.4,
          }}
        >
          Diviora
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[activeTab === "pipeline" ? "pipelines" : activeTab]}
          onClick={(item) => {
            if (item.key === "pipelines") setActiveTab("pipeline");
            else if (item.key === "jobs") setActiveTab("jobs");
            else if (item.key === "dev") setActiveTab("dev");
            else setActiveTab(item.key);
          }}
          items={menuItems}
          style={{ background: "#ffffff" }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "linear-gradient(135deg, #eef3ff, #dbeafe)",
            padding: "18px 24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
              Data Ingestion Workspace
            </Title>
            <Text style={{ color: "#475569" }}>
              Manage connections, pipelines, and live jobs with real-time
              visibility.
            </Text>
          </Space>
        </Header>
        <Content style={{ padding: "24px", background: "#f5f7fb" }}>
          <Card
            bodyStyle={{ padding: 0, overflow: "hidden" }}
            style={{
              border: "1px solid #e5e7eb",
              marginBottom: 16,
              boxShadow: "0 12px 30px rgba(59,130,246,0.08)",
            }}
          >
            <div
              style={{
                padding: "24px",
                background:
                  "radial-gradient(circle at 18% 20%, rgba(37,99,235,0.15), transparent 32%), radial-gradient(circle at 80% 10%, rgba(94,234,212,0.18), transparent 25%), #f8fbff",
              }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={14}>
                  <Space direction="vertical" size={12}>
                    <Badge color="blue" text="Operational" />
                    <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
                      Unified pipeline oversight
                    </Title>
                    <Text style={{ color: "#475569", maxWidth: 640 }}>
                      Track every connection, trigger runs, and see live job
                      health in one enterprise-grade console.
                    </Text>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openWizard}
                      >
                        New data source
                      </Button>
                      <Button
                        type="default"
                        icon={<PlayCircleOutlined />}
                        onClick={() => setActiveTab("pipeline")}
                      >
                        Go to Pipelines
                      </Button>
                      <Button
                        type="default"
                        icon={<ThunderboltOutlined />}
                        onClick={() => setActiveTab("jobs")}
                      >
                        Live Jobs
                      </Button>
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} md={10}>
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Card
                        size="small"
                        style={{ background: "white", borderColor: "#e5e7eb" }}
                      >
                        <Statistic
                          title={
                            <Text style={{ color: "#475569" }}>Sources</Text>
                          }
                          value={stats.sources}
                          suffix={<Tag color="blue">Active</Tag>}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        size="small"
                        style={{ background: "white", borderColor: "#e5e7eb" }}
                      >
                        <Statistic
                          title={
                            <Text style={{ color: "#475569" }}>Pipelines</Text>
                          }
                          value={stats.pipelines}
                          suffix={<Tag color="purple">Ready</Tag>}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        size="small"
                        style={{ background: "white", borderColor: "#e5e7eb" }}
                      >
                        <Statistic
                          title={
                            <Text style={{ color: "#475569" }}>Running</Text>
                          }
                          value={stats.running}
                          suffix={<Tag color="green">Live</Tag>}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        size="small"
                        style={{ background: "white", borderColor: "#e5e7eb" }}
                      >
                        <Statistic
                          title={
                            <Text style={{ color: "#475569" }}>Alerts</Text>
                          }
                          value={stats.alerts}
                          suffix={<Tag color="orange">Open</Tag>}
                        />
                      </Card>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </div>
            <div
              style={{
                padding: 16,
                background: "#ffffff",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <Tabs
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k)}
                items={[
                  {
                    key: "overview",
                    label: "Overview",
                    children: (
                      <div style={{ padding: 12 }}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={16}>
                            <Card
                              title="Pipeline Health"
                              style={{
                                borderColor: "#e5e7eb",
                                background: "#ffffff",
                              }}
                            >
                              <Skeleton
                                active
                                loading={pipelinesLoading}
                                paragraph={{ rows: 3 }}
                              >
                                <Table
                                  size="small"
                                  dataSource={pipelineRows}
                                  pagination={false}
                                  locale={{
                                    emptyText: pipelinesLoading ? (
                                      <Spin />
                                    ) : (
                                      <Empty />
                                    ),
                                  }}
                                  columns={[
                                    {
                                      title: "Name",
                                      dataIndex: "name",
                                      key: "name",
                                    },
                                    {
                                      title: "Type",
                                      dataIndex: "type",
                                      key: "type",
                                      render: (t) => (
                                        <Tag color="geekblue">{t}</Tag>
                                      ),
                                    },
                                    {
                                      title: "Latest",
                                      dataIndex: "latestStatus",
                                      key: "latestStatus",
                                      render: (_, record) => (
                                        <Space>
                                          {statusTag(record.latestStatus)}
                                          {record.latestJobId && (
                                            <Text type="secondary">
                                              #{record.latestJobId}
                                            </Text>
                                          )}
                                        </Space>
                                      ),
                                    },
                                    {
                                      title: "Jobs",
                                      dataIndex: "jobsCount",
                                      key: "jobsCount",
                                      render: (count) => <Tag>{count}</Tag>,
                                    },
                                    {
                                      title: "Actions",
                                      key: "actions",
                                      render: (_, record) => (
                                        <Space>
                                          <Tooltip title="Trigger run">
                                            <Button
                                              icon={<PlayCircleOutlined />}
                                              size="small"
                                              onClick={() =>
                                                triggerPipeline(record)
                                              }
                                            />
                                          </Tooltip>
                                          <Tooltip title="View jobs">
                                            <Button
                                              icon={<EyeOutlined />}
                                              size="small"
                                              onClick={() =>
                                                setActiveTab("jobs")
                                              }
                                            />
                                          </Tooltip>
                                        </Space>
                                      ),
                                    },
                                  ]}
                                />
                              </Skeleton>
                            </Card>
                          </Col>
                          <Col xs={24} md={8}>
                            <Card
                              title="Quick Actions"
                              style={{
                                borderColor: "#e5e7eb",
                                background: "#ffffff",
                              }}
                              bodyStyle={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                              }}
                            >
                              <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={() => setActiveTab("pipeline")}
                              >
                                Trigger a pipeline
                              </Button>
                              <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchJobs}
                              >
                                Sync jobs now
                              </Button>
                              <Button
                                icon={<ArrowRightOutlined />}
                                onClick={() => setActiveTab("jobs")}
                              >
                                Open live jobs
                              </Button>
                            </Card>
                          </Col>
                        </Row>
                      </div>
                    ),
                  },
                  {
                    key: "pipeline",
                    label: "Pipelines",
                    children: (
                      <div style={{ padding: 12 }}>
                        <Space style={{ marginBottom: 12 }}>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openWizard}
                          >
                            New data source
                          </Button>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchPipelines}
                            loading={pipelinesLoading}
                          >
                            Refresh
                          </Button>
                        </Space>
                        {pipelinesError && (
                          <Alert
                            type="error"
                            message={pipelinesError}
                            style={{ marginBottom: 12 }}
                          />
                        )}
                        <Table
                          dataSource={pipelineRows}
                          loading={pipelinesLoading}
                          pagination={{ pageSize: 8 }}
                          rowKey="key"
                          columns={[
                            { title: "Name", dataIndex: "name", key: "name" },
                            {
                              title: "Type",
                              dataIndex: "type",
                              key: "type",
                              render: (t) => <Tag color="geekblue">{t}</Tag>,
                            },
                            {
                              title: "Created",
                              dataIndex: "createdAt",
                              key: "createdAt",
                              render: (v) =>
                                v ? new Date(v).toLocaleString() : "-",
                            },
                            {
                              title: "Jobs",
                              dataIndex: "jobsCount",
                              key: "jobsCount",
                              render: (count) => <Tag>{count}</Tag>,
                            },
                            {
                              title: "Latest",
                              dataIndex: "latestStatus",
                              key: "latestStatus",
                              render: (_, record) => (
                                <Space>
                                  {statusTag(record.latestStatus)}
                                  {record.latestJobId && (
                                    <Text type="secondary">
                                      #{record.latestJobId}
                                    </Text>
                                  )}
                                </Space>
                              ),
                            },
                            {
                              title: "Actions",
                              key: "actions",
                              render: (_, record) => (
                                <Space>
                                  <Tooltip title="Trigger run">
                                    <Button
                                      icon={<PlayCircleOutlined />}
                                      size="small"
                                      onClick={() => triggerPipeline(record)}
                                    />
                                  </Tooltip>
                                  <Tooltip title="Monitor jobs">
                                    <Button
                                      icon={<EyeOutlined />}
                                      size="small"
                                      onClick={() => setActiveTab("jobs")}
                                    />
                                  </Tooltip>
                                </Space>
                              ),
                            },
                          ]}
                        />
                        <Divider />
                        <Card
                          style={{
                            borderColor: "#e5e7eb",
                            background: "#ffffff",
                          }}
                          bodyStyle={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                          title="Need a new pipeline?"
                          extra={
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={openWizard}
                            >
                              Launch wizard
                            </Button>
                          }
                        >
                          <Text type="secondary">
                            Use the guided wizard to add SQL or CSV sources, map
                            schema, and trigger the first run.
                          </Text>
                        </Card>
                      </div>
                    ),
                  },
                  {
                    key: "jobs",
                    label: "Jobs",
                    children: (
                      <div style={{ padding: 12 }}>
                        <Space style={{ marginBottom: 12 }}>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchJobs}
                            loading={jobsLoading}
                          >
                            Refresh
                          </Button>
                        </Space>
                        {jobsError && (
                          <Alert
                            type="error"
                            message={jobsError}
                            style={{ marginBottom: 12 }}
                          />
                        )}
                        <Table
                          dataSource={jobRows}
                          loading={jobsLoading}
                          pagination={{ pageSize: 10 }}
                          rowKey="key"
                          locale={{
                            emptyText: jobsLoading ? <Spin /> : <Empty />,
                          }}
                          columns={[
                            { title: "Job", dataIndex: "id", key: "id" },
                            {
                              title: "Source",
                              dataIndex: "source",
                              key: "source",
                            },
                            {
                              title: "Status",
                              dataIndex: "status",
                              key: "status",
                              render: (s) => statusTag(s),
                            },
                            {
                              title: "Created",
                              dataIndex: "createdAt",
                              key: "createdAt",
                              render: (v) =>
                                v ? new Date(v).toLocaleString() : "-",
                            },
                            {
                              title: "Started",
                              dataIndex: "startedAt",
                              key: "startedAt",
                              render: (v) =>
                                v ? new Date(v).toLocaleString() : "-",
                            },
                            {
                              title: "Completed",
                              dataIndex: "completedAt",
                              key: "completedAt",
                              render: (v) =>
                                v ? new Date(v).toLocaleString() : "-",
                            },
                            {
                              title: "Error",
                              dataIndex: "errorMessage",
                              key: "errorMessage",
                              render: (v) =>
                                v ? <Text type="danger">{v}</Text> : "-",
                            },
                            {
                              title: "Inspect",
                              key: "inspect",
                              render: (_, record) => (
                                <Button
                                  icon={<FileSearchOutlined />}
                                  size="small"
                                  onClick={() => openJobDataDrawer(record.id)}
                                >
                                  View data
                                </Button>
                              ),
                            },
                          ]}
                        />
                      </div>
                    ),
                  },
                  {
                    key: "dev",
                    label: "Dev",
                    children: (
                      <div style={{ padding: 12 }}>
                        <Card
                          title="Danger zone"
                          style={{
                            borderColor: "#fecdd3",
                            background: "#fff1f2",
                          }}
                          headStyle={{ color: "#b91c1c" }}
                        >
                          <Space direction="vertical" size="middle">
                            <Alert
                              type="error"
                              showIcon
                              message="Erase all data"
                              description="This will delete all records in the database. Use only in development."
                              style={{
                                background: "#fff1f2",
                                borderColor: "#fecdd3",
                              }}
                            />
                            <Popconfirm
                              title="Erase all data"
                              description="This cannot be undone. Proceed?"
                              okText="Erase everything"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true, loading: wiping }}
                              onConfirm={wipeDatabase}
                            >
                              <Button
                                danger
                                type="primary"
                                loading={wiping}
                                icon={<AlertOutlined />}
                              >
                                Erase database
                              </Button>
                            </Popconfirm>
                          </Space>
                        </Card>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Card>
          <Drawer
            title={`Job ${dataDrawerJobId ?? ""} • Processed rows`}
            open={dataDrawerOpen}
            onClose={closeJobDataDrawer}
            width={980}
            destroyOnClose
            extra={
              dataDrawerJobId ? (
                <Space>
                  <Button
                    onClick={() => loadJobData(dataDrawerJobId, dataPage)}
                    loading={dataLoading}
                    icon={<ReloadOutlined />}
                  >
                    Refresh
                  </Button>
                </Space>
              ) : null
            }
          >
            {dataError && (
              <Alert
                type="error"
                message={dataError}
                style={{ marginBottom: 12 }}
              />
            )}
            <Table
              rowKey={(row) => row.id ?? `${row.rowNumber}`}
              loading={dataLoading}
              dataSource={dataRows}
              pagination={{
                current: dataPage,
                pageSize: dataPageSize,
                total: dataTotal,
                onChange: (page) =>
                  dataDrawerJobId && loadJobData(dataDrawerJobId, page),
                showSizeChanger: false,
              }}
              columns={[
                {
                  title: "Row #",
                  dataIndex: "rowNumber",
                  key: "rowNumber",
                  width: 90,
                },
                {
                  title: "Data",
                  dataIndex: "data",
                  key: "data",
                  render: (val) => (
                    <pre
                      style={{
                        background: "#f8fafc",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        maxHeight: 240,
                        overflow: "auto",
                        margin: 0,
                      }}
                    >
                      {typeof val === "string"
                        ? val
                        : JSON.stringify(val, null, 2)}
                    </pre>
                  ),
                },
              ]}
            />
          </Drawer>
          <Drawer
            key={wizardKey}
            open={wizardOpen}
            onClose={closeWizard}
            width={960}
            title="Add data source"
            destroyOnClose
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: 16 }}>
              <IngestionDashboard />
            </div>
          </Drawer>
        </Content>
      </Layout>
    </Layout>
  );
}
