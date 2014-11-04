/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.json;

import java.io.IOException;
import java.io.OutputStream;
import java.io.Writer;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

/**
 * Wrapper object for {@link org.json.simple.JSONObject}.
 */
public class JSONObj extends JSONWrapper<JSONObject> {
    List<String> order;
    public JSONObj() {
        this(new JSONObject());
        order = new ArrayList<String>();
    }

    public JSONObj(JSONObject obj) {
        super(obj);
    }

    /**
     * Keys for the object.
     */
    public Iterable<String> keys() {
        if( order != null ){
            return order;
        }
        return raw.keySet();
    }

    /**
     * Determines if the object has the specified property.
     */
    public boolean has(String key) {
        return raw.containsKey(key);
    }

    /**
     * Gets the raw property mapped to <tt>key</tt>, or <tt>null</tt> if no such property exists.
     */
    public Object get(String key) {
        return raw.get(key);
    }

    /**
     * Gets the property mapped to <tt>key</tt> as a string.
     */
    public String str(String key) {
        return to(get(key), String.class);
    }

    /**
     * Gets the property mapped to <tt>key</tt> as a boolean.
     */
    public Boolean bool(String key) {
        return to(get(key), Boolean.class);
    }

    /**
     * Gets the property mapped to <tt>key</tt> as a double.
     */
    public Double doub(String key) {
        return to(get(key), Double.class);
    }

    /**
     * Gets the property mapped to <tt>key</tt> as an integer.
     */
    public Integer integer(String key) {
        return to(get(key), Integer.class);
    }

    /**
     * Gets the property mapped to <tt>key</tt> as an object wrapper.
     */
    public JSONObj object(String key) {
        Object obj = get(key);
        return obj != null ? JSONWrapper.wrap(obj).toObject() : null;
    }

    /**
     * Gets the property mapped to <tt>key</tt> as an array wrapper.
     */
    public JSONArr array(String key) {
        Object arr = get(key);
        return arr != null ? JSONWrapper.wrap(arr).toArray() : null;
    }

    /**
     * Sets the raw property key value pair.
     *
     * @return This object.
     */
    public JSONObj put(String key, Object val) {
        if( !isEmpty(val)){
            if( order != null && !raw.containsKey(key)){
                order.add(key);
            }
            raw.put(key, val);
        }
        return this;
    }
    
    private boolean isEmpty( Object val ){
        return val == null ||
                (val instanceof JSONObj && ((JSONObj)val).size() == 0) ||
                (val instanceof JSONArr && ((JSONArr)val).size() == 0);
    }

    /**
     * Creates a new object mapped to <tt>key</tt> and returns the new object.
     *
     * @return The new object wrapper.
     */
    public JSONObj putObject(String key) {
        JSONObj obj = new JSONObj();
        if( order != null && !raw.containsKey(key)){
            order.add(key);
        }
        raw.put(key, obj.raw);
        return obj;
    }

    /**
     * Creates a new array mapped to <tt>key</tt> and returns the new array.
     *
     * @return The new array wrapper.
     */
    public JSONArr putArray(String key) {
        JSONArr arr = new JSONArr();
        if( order != null && !raw.containsKey(key)){
            order.add(key);
        }
        raw.put(key, arr);
        return arr;
    }

    @Override
    public int size() {
        return raw.size();
    }
    @Override
    void write(Writer out) throws IOException {
        //this.raw().writeJSONString(out);
        if(raw == null){
            out.write("null");
        }
        else {
            boolean first = true;
            Iterable<String> keys = keys();
            Iterator<String> iter = keys.iterator();
    
            out.write('{');
            while (iter.hasNext()) {
                if (first){
                    first = false;
                }
                else{
                    out.write(',');
                }
                String key = iter.next();
                Object value = raw.get(key);
                
                
                out.write('\"');
                out.write(JSONObject.escape(key));
                out.write('\"');
                out.write(':');
                JSONWrapper.write(value, out);
            }
            out.write('}');
        }
        out.flush();
    }
}
