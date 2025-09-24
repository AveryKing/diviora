# Diviora

**Diviora** is a full-stack data integration platform built on Azure. It connects multiple data sources (APIs, CSV uploads, databases), processes them into a unified data model, and provides a foundation for analytics, dashboards, or downstream applications.  

---

## **Tech Stack**

### **Frontend**
- **Next.js** – React framework for web UI  
- **Deployment:** Azure Static Web Apps  
- **Features:**
  - User authentication via **Azure AD B2C**
  - File uploads (CSV/Excel)
  - Data dashboards & visualizations (future-ready)

### **Backend**
- **NestJS** – Node.js framework, containerized  
- **Deployment:** Azure App Service  
- **Responsibilities:**
  - REST/GraphQL APIs
  - Data orchestration and ETL processing
  - Consumer of **Azure Service Bus** messages for async processing

### **Serverless Functions**
- **Azure Functions** for ETL jobs
- Triggered by:
  - **Blob Storage** (file uploads)
  - **Azure Service Bus** messages
- Handles:
  - Validation, transformation, and cleaning
  - Writing processed data to Azure SQL / Cosmos DB

### **Data Layer**
- **Azure SQL Database** – clean, relational data  
- **Azure Blob Storage** – raw file storage  
- **Azure Cosmos DB (optional)** – semi-structured JSON data  
- **Azure Data Factory** – orchestrates ETL pipelines  

### **Messaging**
- **Azure Service Bus** – decouples ingestion from processing, supports retries and scaling  

### **Monitoring**
- **Application Insights** – API & function monitoring  
- **Azure Monitor / Log Analytics** – pipeline and queue tracking  

---

## **Architecture Workflow (Textual)**

1. User uploads CSV/API data → stored in **Blob Storage**  
2. Blob trigger → **Azure Function** validates file → sends **Service Bus message**  
3. NestJS or worker function listens to Service Bus → processes data → writes clean data to **Azure SQL** / **Cosmos DB**  
4. Frontend dashboards (Next.js) fetch data via API  
5. **Monitoring:** Application Insights + Azure Monitor  

---

## **Implementation Steps**

1. Set up **Azure AD B2C** for authentication  
2. Configure **Blob Storage** and triggers  
3. Deploy **NestJS backend** to Azure App Service  
4. Create **Azure Service Bus** queue/topic  
5. Implement **ETL Azure Functions**  
6. Connect **frontend dashboards** to backend APIs  
7. Configure **Application Insights** for monitoring  

---

## **Project Status**

- [ ] Frontend (Next.js + Static Web Apps)  
- [ ] Backend (NestJS container)  
- [ ] Azure Functions ETL pipelines  
- [ ] Blob Storage triggers  
- [ ] Service Bus integration  
- [ ] SQL + Cosmos DB integration  
- [ ] Azure AD B2C authentication  
- [ ] Monitoring setup (Application Insights)  

---

## **References**

- [Next.js Documentation](https://nextjs.org/docs)  
- [NestJS Documentation](https://docs.nestjs.com/)  
- [Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/)  
- [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/)  
- [Azure Service Bus](https://learn.microsoft.com/en-us/azure/service-bus-messaging/)  
- [Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/)  
- [Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/)  
- [Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/)  
- [Azure AD B2C](https://learn.microsoft.com/en-us/azure/active-directory-b2c/)  
- [Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
