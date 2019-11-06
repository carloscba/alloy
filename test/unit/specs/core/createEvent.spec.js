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

import createEvent from "../../../../src/core/createEvent";

describe("createEvent", () => {
  let event;

  beforeEach(() => {
    event = createEvent();
  });

  it("deeply merges XDM with user-provided XDM merged last", () => {
    event.setUserXdm({
      fruit: {
        type: "apple"
      },
      veggie: {
        type: "carrot"
      }
    });
    event.mergeXdm({
      fruit: {
        type: "strawberry"
      },
      sport: {
        type: "basketball"
      }
    });
    event.mergeXdm({
      sport: {
        type: "football"
      },
      game: {
        type: "clue"
      }
    });
    expect(event.toJSON()).toEqual({
      xdm: {
        fruit: {
          type: "apple"
        },
        veggie: {
          type: "carrot"
        },
        sport: {
          type: "football"
        },
        game: {
          type: "clue"
        }
      }
    });
  });

  it("sets user data", () => {
    event.setUserData({ fruit: "apple" });
    event.setUserData({ veggie: "carrot" });
    expect(event.toJSON()).toEqual({
      data: {
        veggie: "carrot"
      }
    });
  });

  it("deeply merges meta", () => {
    event.mergeMeta({
      fruit: {
        type: "strawberry"
      },
      sport: {
        type: "basketball"
      }
    });
    event.mergeMeta({
      sport: {
        type: "football"
      },
      game: {
        type: "clue"
      }
    });
    expect(event.toJSON()).toEqual({
      meta: {
        fruit: {
          type: "strawberry"
        },
        sport: {
          type: "football"
        },
        game: {
          type: "clue"
        }
      }
    });
  });

  it("deeply merges query", () => {
    event.mergeQuery({
      fruit: {
        type: "strawberry"
      },
      sport: {
        type: "basketball"
      }
    });
    event.mergeQuery({
      sport: {
        type: "football"
      },
      game: {
        type: "clue"
      }
    });
    expect(event.toJSON()).toEqual({
      query: {
        fruit: {
          type: "strawberry"
        },
        sport: {
          type: "football"
        },
        game: {
          type: "clue"
        }
      }
    });
  });

  it("sets documentUnloading", () => {
    expect(event.isDocumentUnloading()).toBeFalse();
    event.documentUnloading();
    expect(event.isDocumentUnloading()).toBeTrue();
  });

  it("sets expectsResponse", () => {
    expect(event.expectsResponse).toBeFalse();
    event.expectResponse();
    expect(event.expectsResponse).toBeTrue();
  });

  it("reports whether the event is empty", () => {
    expect(event.isEmpty()).toBeTrue();
    event.expectResponse();
    event.setUserData({ foo: "bar" });
    expect(event.isEmpty()).toBeFalse();
  });
});