/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.util;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.collect.EvictingQueue;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * Tracks recently used objects.
 */
@Component
public class RecentObjectCache {

    public static final int DEFAULT_SIZE = 5;

    LoadingCache<Class<?>, EvictingQueue<String>> cache;

    public RecentObjectCache() {
        this(DEFAULT_SIZE);
    }

    public RecentObjectCache(final int size) {
        cache = CacheBuilder.newBuilder().build(new CacheLoader<Class<?>, EvictingQueue<String>>() {
            @Override
            public EvictingQueue<String> load(Class<?> key) throws Exception {
                return EvictingQueue.create(size);
            }
        });
    }

    public <T> void add(Class<T> clazz, String id) {
        if (id == null) {
            return;
        }

        EvictingQueue<String> q = q(clazz);
        synchronized (q) {
            q.offer(id);
        }
    }

    public <T> Iterable<String> list(Class<T> clazz) {
        List<String> list = null;

        EvictingQueue<String> q = q(clazz);
        synchronized (q) {
            list = new ArrayList(q);
        }

        Collections.reverse(list);
        return new LinkedHashSet<>(list);
    }

    public <T> boolean remove(Class<T> clazz, String id) {
        EvictingQueue<String> q = q(clazz);
        synchronized (q) {
            return q.remove(id);
        }
    }

    <T> EvictingQueue<String> q(Class<T> clazz) {
        try {
            return cache.get(clazz);
        } catch (ExecutionException e) {
            throw new RuntimeException(e);
        }
    }
}
