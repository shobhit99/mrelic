# Fluent Bit Configuration Guide

## Overview
Fluent Bit is a lightweight log processor and forwarder that can collect logs from various sources, process them, and send them to different destinations.

## Main Configuration Sections

### 1. SERVICE Section
Global configuration for Fluent Bit:
```ini
[SERVICE]
    Flush        1
    Log_Level    info
    Parsers_File parsers.conf
    HTTP_Server  On
    HTTP_Listen  0.0.0.0
    HTTP_Port    2020
```

### 2. INPUT Plugins (Data Sources)

#### Tail Input (Read log files)
```ini
[INPUT]
    Name              tail
    Tag               kube.*
    Path              /var/log/containers/*.log
    Parser            docker
    DB                /var/log/flb_kube.db
    Skip_Long_Lines   On
    Refresh_Interval  10
```

#### Systemd Input (Read systemd journal)
```ini
[INPUT]
    Name              systemd
    Tag               systemd.*
    Systemd_Filter    _SYSTEMD_UNIT=docker.service
    Read_From_Tail    On
```

#### TCP Input (Receive logs over TCP)
```ini
[INPUT]
    Name              tcp
    Tag               tcp.*
    Listen            0.0.0.0
    Port              5170
    Buffer_Size       256
    Separator         \n
```

#### HTTP Input (Receive logs via HTTP)
```ini
[INPUT]
    Name              http
    Tag               http.*
    Listen            0.0.0.0
    Port              8888
    HTTP_User         fluent-bit
    HTTP_Passwd       your-password
```

### 3. FILTER Plugins (Data Processing)

#### Record Modifier (Add/modify fields)
```ini
[FILTER]
    Name                modify
    Match               *
    Add                 service_name ${SERVICE_NAME}
    Add                 environment ${ENVIRONMENT}
    Add                 version ${APP_VERSION}
    Rename              log message
    Remove              unnecessary_field
```

#### Kubernetes Filter (Add K8s metadata)
```ini
[FILTER]
    Name                kubernetes
    Match               kube.*
    Kube_URL           https://kubernetes.default.svc:443
    Kube_CA_Path       /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_Path    /var/run/secrets/kubernetes.io/serviceaccount/token
    Merge_Log          On
    K8S-Logging.Parser On
    K8S-Logging.Exclude On
    Use_Kubelet        Off
    Kubelet_Port       10250
```

#### Parser Filter (Parse structured data)
```ini
[FILTER]
    Name                parser
    Match               *
    Key_Name            log
    Parser              json
    Reserve_Data        On
```

#### Grep Filter (Filter by content)
```ini
[FILTER]
    Name                grep
    Match               *
    Regex               $level error
    Exclude             $message debug
```

#### Lua Filter (Custom processing)
```ini
[FILTER]
    Name                lua
    Match               *
    Script              /path/to/script.lua
    Call                cb_print
```

### 4. OUTPUT Plugins (Destinations)

#### HTTP Output (Send to HTTP endpoint)
```ini
[OUTPUT]
    Name                http
    Match               *
    Host                localhost
    Port                5959
    URI                 /api/otel
    Format              json
    Header              Content-Type application/json
    HTTP_User           fluent-bit
    HTTP_Passwd         your-password
    Generate_ID         On
    Retry_Limit         False
```

#### Forward Output (Send to Fluentd)
```ini
[OUTPUT]
    Name                forward
    Match               *
    Host                fluentd.example.com
    Port                24224
    Shared_Key          your-secret-key
    Self_Hostname       fluent-bit-node-1
```

#### Elasticsearch Output
```ini
[OUTPUT]
    Name                es
    Match               *
    Host                elasticsearch.example.com
    Port                9200
    Index               fluent-bit
    Type                _doc
    HTTP_User           elastic
    HTTP_Passwd         your-password
    Suppress_Type_Name  On
```

#### Kafka Output
```ini
[OUTPUT]
    Name                kafka
    Match               *
    Brokers             kafka.example.com:9092
    Topics              logs
    Timestamp_Key       @timestamp
    Message_Key         message
```

## Service Name Configuration Options

### Option 1: Environment Variables
```ini
[FILTER]
    Name                modify
    Match               *
    Add                 service_name ${SERVICE_NAME}
    Add                 service ${SERVICE_NAME}
    Condition           Key_Does_Not_Exist service_name
```

### Option 2: Kubernetes Labels
```ini
[FILTER]
    Name                kubernetes
    Match               kube.*
    Kube_URL           https://kubernetes.default.svc:443
    Kube_CA_Path       /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_Path    /var/run/secrets/kubernetes.io/serviceaccount/token
    Merge_Log          On
    K8S-Logging.Parser On
    K8S-Logging.Exclude On
    Use_Kubelet        Off
    Kubelet_Port       10250
```

### Option 3: Container Labels
```ini
[FILTER]
    Name                modify
    Match               *
    Add                 service_name ${KUBERNETES_SERVICE_NAME}
    Add                 namespace ${KUBERNETES_NAMESPACE}
    Add                 pod_name ${KUBERNETES_POD_NAME}
```

### Option 4: File Path Patterns
```ini
[FILTER]
    Name                lua
    Match               *
    Script              /path/to/service_extractor.lua
    Call                extract_service_from_path
```

## Advanced Configuration Examples

### Multi-line Log Processing
```ini
[INPUT]
    Name              tail
    Tag               multiline.*
    Path              /var/log/app/*.log
    Parser            multiline
    DB                /var/log/flb_multiline.db
    Skip_Long_Lines   On
    Refresh_Interval  10
    Multiline         On
    Parser_Firstline  multiline_firstline
    Parser_1          multiline_parser
```

### Log Aggregation with Service Names
```ini
[SERVICE]
    Flush        1
    Log_Level    info
    Parsers_File parsers.conf

[INPUT]
    Name              tail
    Tag               app.*
    Path              /var/log/app/*.log
    Parser            json
    DB                /var/log/flb_app.db

[FILTER]
    Name                modify
    Match               app.*
    Add                 service_name ${SERVICE_NAME}
    Add                 environment ${ENVIRONMENT}
    Add                 version ${APP_VERSION}

[FILTER]
    Name                parser
    Match               app.*
    Key_Name            log
    Parser              json
    Reserve_Data        On

[OUTPUT]
    Name                http
    Match               app.*
    Host                localhost
    Port                5959
    URI                 /api/otel
    Format              json
    Header              Content-Type application/json
    Generate_ID         On
```

### Docker Compose with Service Names
```yaml
version: '3.8'
services:
  app1:
    image: your-app:latest
    environment:
      - SERVICE_NAME=user-service
      - ENVIRONMENT=production
    volumes:
      - ./logs:/var/log/app

  app2:
    image: your-app:latest
    environment:
      - SERVICE_NAME=payment-service
      - ENVIRONMENT=production
    volumes:
      - ./logs:/var/log/app

  fluent-bit:
    image: fluent/fluent-bit:latest
    volumes:
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
      - ./logs:/var/log/app:ro
    command: /fluent-bit/bin/fluent-bit -c /fluent-bit/etc/fluent-bit.conf
```

## Testing Your Configuration

1. Start your application with Fluent Bit:
```bash
docker-compose up -d
```

2. Check Fluent Bit logs:
```bash
docker-compose logs fluent-bit
```

3. Send test logs:
```bash
curl -X POST http://localhost:5959/api/otel \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2024-01-15T10:30:00.000Z",
    "level": "info",
    "service": "test-service",
    "message": "Test log with service name"
  }'
```

4. View logs in your application at `http://localhost:5959`

## Common Issues and Solutions

### Issue: Service name not appearing in logs
**Solution**: Ensure the service name is being added in the filter chain:
```ini
[FILTER]
    Name                modify
    Match               *
    Add                 service_name ${SERVICE_NAME}
    Condition           Key_Does_Not_Exist service_name
```

### Issue: Logs not reaching your application
**Solution**: Check the HTTP output configuration:
```ini
[OUTPUT]
    Name                http
    Match               *
    Host                localhost
    Port                5959
    URI                 /api/otel
    Format              json
    Header              Content-Type application/json
```

### Issue: Parsing errors
**Solution**: Use appropriate parsers for your log format:
```ini
[PARSER]
    Name        json
    Format      json
    Time_Key    timestamp
    Time_Format %Y-%m-%dT%H:%M:%S.%L
    Time_Keep   On
```

## Best Practices

1. **Always include service names** in your log configuration
2. **Use structured logging** (JSON format) when possible
3. **Add timestamps** to all log entries
4. **Include log levels** for better filtering
5. **Use appropriate parsers** for your log format
6. **Test your configuration** before deploying to production
7. **Monitor Fluent Bit logs** for errors
8. **Use environment variables** for configuration
9. **Implement retry logic** for network failures
10. **Secure your endpoints** with authentication 