/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.json;

import org.geotools.util.Converters;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.Writer;

/**
 * Abstract base class for JSON object wrappers.
 */
public abstract class JSONWrapper<T extends JSONStreamAware> {

    /**
     * Wraps the specified object.
     *
     * @param obj One of {@link org.json.simple.JSONObject} or {@link org.json.simple.JSONArray}.
     *
     * @return One of {@link JSONObj} or {@link JSONArr}.
     *
     * @throws java.lang.IllegalArgumentException If the specified object is not on of the supported types.
     *
     */
    public static JSONWrapper<?> wrap(Object obj) {
        Object thing = wrapOrSelf(obj);
        if (thing instanceof JSONWrapper) {
            return (JSONWrapper) thing;
        }

        throw new IllegalArgumentException("Unsupported object: " + obj);
    }

    /**
     * Wraps the specified object, returning the original object if it is not one of the supported types.
     */
    public static Object wrapOrSelf(Object obj) {
        if (obj instanceof JSONObject) {
            return new JSONObj((JSONObject) obj);
        }
        else if (obj instanceof JSONArray) {
            return new JSONArr((JSONArray) obj);
        }
        else {
            return obj;
        }
    }

    /**
     * Encodes a wrapper as JSON.
     *
     * @param obj The wrapper.
     * @param output Target output stream.
     *
     */
    public static void write(JSONWrapper<? extends JSONStreamAware> obj, OutputStream output) throws IOException {
        write(obj, new OutputStreamWriter(output));
    }

    /**
     * Encodes a wrapper as JSON.
     *
     * @param obj The wrapper.
     * @param output Target writer.
     *
     */
    public static void write(JSONWrapper<? extends JSONStreamAware> obj, Writer output) throws IOException {
        obj.raw().writeJSONString(output);
        output.flush();
    }

    /**
     * Decodes JSON content returning a wrapper.
     *
     * @param input Input JSON.
     *
     * @return The wrapper.
     */
    public static JSONWrapper<?> read(String input) throws IOException {
        return read(new StringReader(input));
    }

    /**
     * Decodes JSON content returning a wrapper.
     *
     * @param input Input JSON.
     *
     * @return The wrapper.
     */
    public static JSONWrapper<?> read(InputStream input) throws IOException {
        return read(new InputStreamReader(input));
    }

    /**
     * Decodes JSON content returning a wrapper.
     *
     * @param input Input JSON.
     *
     * @return The wrapper.
     */
    public static JSONWrapper<?> read(Reader input) throws IOException {
        try {
            return wrap(new JSONParser().parse(input));
        } catch (ParseException e) {
            throw new IOException("Parsing error", e);
        }
    }

    protected T raw;

    public JSONWrapper(T raw) {
        this.raw = raw;
    }

    /**
     * Underlying JSON object.
     */
    public T raw() {
        return raw;
    }

    /**
     * Size of the object, either the number of properties of the object or size of the array.
     */
    public abstract int size();

    /**
     * Casts the wrapper to an object wrapper.
     */
    public JSONArr toArray() {
        if (this instanceof JSONArr) {
            return (JSONArr) this;
        }
        throw new ClassCastException("Not an array");
    }

    /**
     * Casts the wrapper to an array wrapper.
     */
    public JSONObj toObject() {
        if (this instanceof JSONObj) {
            return (JSONObj) this;
        }
        throw new ClassCastException("Not an object");
    }

    /**
     * Encodes the wrapper to the specified output stream.
     */
    public void write(OutputStream output) throws IOException {
        write(this, output);
    }

    /**
     * Conversion helper.
     */
    protected <T> T to(Object obj, Class<T> type) {
        return Converters.convert(obj, type);
    }

    @Override
    public String toString() {
        StringWriter w = new StringWriter();
        try {
            write(this, w);
        } catch (Exception e) {
            return e.getMessage();
        }
        return w.toString();
    }
}
