/** @format */

import { SSTConfig } from "sst";
import {APIStack} from "./stacks/API";

export default {
  config(_input) {
    return {
      name: "sarahbot",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(APIStack);
  },
} satisfies SSTConfig;
