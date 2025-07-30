function convert_timestamp(tag, timestamp, record)
    -- Check if timestamp field exists
    if record["timestamp"] ~= nil then
        -- Convert milliseconds to seconds
        local ts_seconds = record["timestamp"] / 1000
        
        -- Update the record with the converted timestamp
        record["timestamp"] = ts_seconds
        
        -- Add an ISO8601 formatted timestamp for better readability
        -- This is optional but can be useful for debugging
        local ts_iso = os.date("!%Y-%m-%dT%H:%M:%S", ts_seconds)
        local ms = record["timestamp"] % 1
        if ms > 0 then
            ts_iso = ts_iso .. string.format(".%03dZ", ms * 1000)
        else
            ts_iso = ts_iso .. "Z"
        end
        record["@timestamp"] = ts_iso
    end
    
    return 1, timestamp, record
end