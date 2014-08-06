package org.opengeo.app;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Convenience wrapper around {@link org.json.simple.JSONObject}.
 */
public class JSONObj {

    Object last;
    Deque<Object> stack;

    public JSONObj() {
        stack = new ArrayDeque<Object>();
    }

    public JSONObj object() {
        JSONObject obj = new JSONObject();
        if (!stack.isEmpty()) {
            if (stack.peek() instanceof JSONArray) {
                add(obj);
            }
            else {
                throw new IllegalStateException("anonymous object only allowed at top level or in array");
            }
        }
        stack.push(obj);
        return this;
    }

    public JSONObj object(String key) {
        JSONObject obj = new JSONObject();
        if (stack.peek() instanceof JSONObject) {
            put(key, obj);
        }
        else {
            add(obj);
        }
        stack.push(obj);
        return this;
    }

    public JSONObj array() {
        if (!stack.isEmpty()) {
            throw new IllegalStateException("anonymous array only allowed at top level");
        }

        JSONArray arr = new JSONArray();
        stack.push(arr);
        return this;
    }

    public JSONObj array(String key) {
        JSONArray arr = new JSONArray();
        put(key, arr);
        stack.push(arr);
        return this;
    }

    public JSONObj put(String key, Object value) {
        ((JSONObject)stack.peek()).put(key, value);
        return this;
    }

    public JSONObj add(Object value) {
        ((JSONArray)stack.peek()).add(value);
        return this;
    }

    public JSONObj end() {
        last = stack.pop();
        return this;
    }

    public void write(OutputStream output) throws IOException {
        OutputStreamWriter writer = new OutputStreamWriter(output);
        ((JSONStreamAware)last).writeJSONString(writer);
        writer.flush();
    }
}
