/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import createNetwork from "../../../../src/core/network/createNetwork";

describe("createNetwork", () => {
  const config = {
    edgeDomain: "alloy.mysite.com",
    propertyID: "mypropertyid"
  };

  const logger = console;

  const nullLifecycle = {
    onBeforeSend: () => Promise.resolve(),
    onResponse: () => Promise.resolve()
  };

  it("calls interact by default", done => {
    const networkStrategy = url => {
      expect(url).toEqual(
        "https://alloy.mysite.com/interact?propertyID=mypropertyid"
      );
      done();
      return Promise.resolve();
    };
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    network.sendRequest(payload);
  });

  it("can call collect", done => {
    const networkStrategy = url => {
      expect(url).toEqual(
        "https://alloy.mysite.com/collect?propertyID=mypropertyid"
      );
      done();
      return Promise.resolve();
    };
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    network.sendRequest(payload, false);
  });

  it("sends the payload", done => {
    const networkStrategy = (url, json) => {
      expect(JSON.parse(json).events[0]).toEqual({ id: "myevent1" });
      done();
      return Promise.resolve();
    };
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    payload.addEvent({ id: "myevent1" });
    network.sendRequest(payload);
  });

  it("logs the request and response when response is expected", done => {
    spyOn(logger, "log");
    const mockResponse = { requestId: "myrequestid", handle: [] };
    const networkStrategy = () => Promise.resolve(JSON.stringify(mockResponse));
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    payload.addEvent({ id: "myevent1" });
    network.sendRequest(payload).then(() => {
      expect(logger.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/^Request .+: Sending request.$/),
        JSON.parse(JSON.stringify(payload))
      );
      expect(logger.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/^Request .+: Received response.$/),
        mockResponse
      );
      done();
    });
  });

  it("logs only the request when no response is expected", done => {
    spyOn(logger, "log");
    const networkStrategy = () => Promise.resolve();
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    payload.addEvent({ id: "myevent1" });
    network.sendRequest(payload, false).then(() => {
      expect(logger.log).toHaveBeenCalledWith(
        jasmine.stringMatching(
          /^Request .+: Sending request \(no response is expected\).$/
        ),
        payload.toJSON()
      );
      expect(logger.log.calls.count()).toBe(1);
      done();
    });
  });

  it("resolves the returned promise", done => {
    const networkStrategy = () =>
      Promise.resolve(JSON.stringify({ requestId: "myrequestid", handle: [] }));
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    network
      .sendRequest(payload)
      .then(response => {
        expect(response.getPayloadByType).toEqual(jasmine.any(Function));
        done();
      })
      .catch(done.fail);
  });

  it("rejects the returned promise", done => {
    const networkStrategy = () => Promise.reject(new Error("myerror"));
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    network.sendRequest(payload).catch(error => {
      expect(error.message).toEqual("myerror");
      done();
    });
  });

  it("rejects the promise when response is invalid json", done => {
    const networkStrategy = () => Promise.resolve("badbody");
    const network = createNetwork(
      config,
      logger,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    network
      .sendRequest(payload)
      .then(done.fail)
      .catch(e => {
        // The native parse error message is different based on the browser
        // so we'll just check to parts we control.
        expect(e.message).toContain("Error parsing server response.\n");
        expect(e.message).toContain("\nResponse body: badbody");
        done();
      });
  });

  it("allows components to handle response", done => {
    const myresponse = {
      requestId: "myrequestid",
      handle: [
        {
          type: "mytype",
          payload: { id: "myfragmentid" }
        }
      ]
    };
    const lifecycle = {
      onBeforeSend: () => undefined,
      onResponse: response => {
        const cleanResponse = response.toJSON();
        expect(cleanResponse).toEqual(myresponse);
        done();
      }
    };
    const networkStrategy = () => Promise.resolve(JSON.stringify(myresponse));
    const network = createNetwork(config, logger, lifecycle, networkStrategy);
    const payload = network.createPayload();
    network.sendRequest(payload);
  });

  [true, false].forEach(expectsResponse => {
    it(`allows components to get the request info (beacon = ${expectsResponse})`, done => {
      const lifecycle = {
        onBeforeSend: jasmine.createSpy().and.callFake(() => Promise.resolve()),
        onResponse: () => Promise.resolve()
      };
      const networkStrategy = () => Promise.resolve("{}");
      const network = createNetwork(config, logger, lifecycle, networkStrategy);
      const payload = network.createPayload();
      const responsePromise = network.sendRequest(payload, expectsResponse);
      responsePromise.then(() => {
        expect(lifecycle.onBeforeSend).toHaveBeenCalledWith({
          payload,
          responsePromise,
          isBeacon: !expectsResponse
        });
        done();
      });
    });
  });

  it("doesn't try to parse the response on a beacon call", done => {
    const networkStrategy = () => {
      return Promise.resolve();
    };
    const loggerSpy = jasmine.createSpyObj("logger", ["warn"]);
    const network = createNetwork(
      config,
      console,
      nullLifecycle,
      networkStrategy
    );
    const payload = network.createPayload();
    network.sendRequest(payload);
    setTimeout(() => {
      expect(loggerSpy.warn).not.toHaveBeenCalled();
      done();
    }, 100);
  });
});
