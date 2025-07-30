function format_record(tag, timestamp, record)
    -- Create a new record with the timestamp included
    local new_record = {
        timestamp = record.timestamp,
        level = record["log.level"] or "info",
        message = record.message,
        meta = {}
    }

    -- Move all other fields to meta
    for k, v in pairs(record) do
        if k ~= "timestamp" and k ~= "log.level" and k ~= "message" then
            new_record.meta[k] = v
        end
    end

    return 1, timestamp, new_record
end 