-- Function to check if a string is valid JSON
function is_json(str)
    -- Simple check: JSON must start with { or [
    return str:match("^%s*[{[]")
end

-- Function to convert a record to Winston-like format
function to_winston_format(record)
    local winston_record = {}
    
    -- Set timestamp
    if record["timestamp"] then
        -- Convert milliseconds to seconds if needed
        if record["timestamp"] > 1000000000000 then
            winston_record["timestamp"] = record["timestamp"] / 1000
        else
            winston_record["timestamp"] = record["timestamp"]
        end
    end
    
    -- Set log level
    winston_record["level"] = record["log.level"] or "info"
    
    -- Set message
    winston_record["message"] = record["message"] or ""
    
    -- Add trace information
    if record["trace.id"] then
        winston_record["trace_id"] = record["trace.id"]
    end
    
    if record["span.id"] then
        winston_record["span_id"] = record["span.id"]
    end
    
    -- Add metadata
    winston_record["meta"] = {}
    
    -- Add all other fields to metadata
    for k, v in pairs(record) do
        if k ~= "timestamp" and k ~= "log.level" and k ~= "message" and k ~= "trace.id" and k ~= "span.id" then
            winston_record["meta"][k] = v
        end
    end
    
    return winston_record
end

function process_record(tag, timestamp, record)
    -- Check if this is a valid JSON record
    if type(record) ~= "table" then
        print("Skipping non-JSON record")
        return -1, timestamp, record
    end
    
    -- Skip empty records
    local is_empty = true
    for _, _ in pairs(record) do
        is_empty = false
        break
    end
    
    if is_empty then
        print("Skipping empty record")
        return -1, timestamp, record
    end
    
    -- Convert to Winston-like format
    local winston_record = to_winston_format(record)
    
    -- Return 1 to indicate success, and return the modified record
    return 1, timestamp, winston_record
end

-- This function is called when Fluent Bit starts
function on_init()
    print("Winston formatter initialized")
    return 0
end