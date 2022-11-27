# Hot Rod JS Client Sample

This repo includes a sample microservice application using a shared datagrid to store some data.

The microservice application design is:

* **service-put** creates random values and stored in the datagrid.
* **service-get** gets data from datagrid.
* **cache-service** stores the data for both services.

The workflow is

1. **service-put** creates and store a key and value in the datagrid.
2. **service-put** invokes to the **services-get**.
3. **service-get** gets the key from the request, fetch the data from the datagrid and response the value in a new header.
4. **service-put** compares the data value from the **service-get**'s response and creates the final response as
    * 200 is both data values are the same
    * 422 is data values are different

## Environment

This repo was tested and verified in:

* Red Hat OpenShift Container Platform 4.11.7 (Provided by [OpenShift Local](https://developers.redhat.com/products/openshift-local/overview))
* Red Hat DataGrid 8.4.0

Some of the components must be installed by users with `cluster-admin` privileges.

## Deploy Applications

Create namespace:

```shell
oc new-project nodejs-client-infinispan-sample
```

Deploy DataGrid Operator:

```shell
oc apply -f operators/operators/datagrid-operator.yml 
```

Verify DataGrid Operator is deployed:

```shell
❯ oc get csv
NAME                       DISPLAY     VERSION   REPLACES                   PHASE
datagrid-operator.v8.4.0   Data Grid   8.4.0     datagrid-operator.v8.3.9   Succeeded
```

Deploy DataGrid server:

```shell
oc apply -f operators/cache-services-infinispan.yml 
```

Verify DataGrid service is up and running:

```shell
❯ oc get infinispan cache-services -o yaml
# ...
status:
  conditions:
  - status: "True"
    type: PreliminaryChecksPassed
  - message: 'View: cache-services-0-33013'
    status: "True"
    type: WellFormed
  # ..
  podStatus:
    ready:
    - cache-services-1
  statefulSetName: cache-services
```

Deploy cache to store data for both microservices:

```shell
oc apply -f operators/caches/call-context-cache.yml 
```

Verify Cache is up and running:

```shell
❯ oc get cache call-context -o yaml
# ...
status:
  conditions:
  - status: "True"
    type: Ready
```

Deploy Service Put:

```shell
oc new-app --name service-put nodejs:16-ubi8~./service-put/.
oc start-build service-put --from-dir ./service-put/.
```

Expose service with a route:

```shell
oc expose svc/service-put
```

Deploy Service Get:

```shell
oc new-app --name service-get nodejs:16-ubi8~./service-get/.
oc start-build service-get --from-dir ./service-get/.
```

Test the service:

```shell
curl -i -w "\n" http://$(oc get route service-put -o jsonpath='{.spec.host}')
```

The output should be similar to:

```shell
HTTP/1.1 200 OK
x-powered-by: Express
content-type: text/html; charset=utf-8
content-length: 80
etag: W/"50-3C8KdDneehBRzN/ZmHYXkLdrQxo"
date: Sun, 27 Nov 2022 18:26:35 GMT
keep-alive: timeout=5
set-cookie: 0e69c7a31b8f4f7b3693c637673c45de=cfdf485625bb1d6f6d19ee9e73ee0193; path=/; HttpOnly
cache-control: private

Key processing successful: Hello from Service Get! - service-get-56dc9c974-zj9bn
```

## Performance

The [locustfile.py](locustfile.py) file is a performance script using the
[Locust](https://docs.locust.io/en/stable/writing-a-locustfile.html) that is an open source load testing tool.
This tool defines user behavior, and swarm our system with millions of simultaneous users.

This script requires Python to execute it and install the library with:

```shell
pip3 install locust
```

For example, the following command will start the script using the host of **service-put** using
100 users with a short ramp up during one minute. 

```shell
locust \
  --locustfile locustfile.py \
  --headless \
  --host http://$(oc get route service-put -o jsonpath='{.spec.host}') \
  --users 100 --spawn-rate 0.1 \
  --run-time 1m \
  --loglevel INFO \
  --print-stats --only-summary
```

**NOTE:** If you get this warning message:

`[2022-11-14 12:44:46,519] redhat/WARNING/locust.main: System open file limit '1024' is below minimum setting '10000'.`

You could avoid it increasing the limit executing in your terminal `ulimit -Sn 10240`.

## References

* [Hot Rod JS Client Guide](https://infinispan.org/docs/hotrod-clients/js/latest/js_client.html)
* [Hot Rod JS Client](https://github.com/infinispan/js-client)
