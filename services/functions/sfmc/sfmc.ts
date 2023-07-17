/** @format */

// Import required functions and constant from utilities
import { isAuthorized } from "../utilities/auth";
import { failure, success, unauthorized } from "../utilities/responses";
import { categoryListing, tagSearch } from "../utilities/sfmc";
import { ENV } from "../utilities/static";

/**
 * history
 * @description Returns a list of content items from the SFMC category
 * @param event
 * @returns any[]
 */
export const history = async (event: any) => {
  // Check user authorization
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }

  // Parse JSON from event body
  const body = JSON.parse(event.body);

  // Fetch content items from SFMC category
  const results = await categoryListing(
    event.category || ENV.SFMC_CATEGORY_ID,
    body.page || 1
  );

  // Return as a success response
  return success(results);
};

/**
 * searchByTag
 * @description Returns a list of content items from SFMC that match the given tag
 * @param event
 * @returns any[]
 */
export const searchByTag = async (event: any) => {
  // Get tag value from URL parameters
  const tag = event?.queryStringParameters?.tag;

  // If a tag is received, search for it in SFMC items
  if (tag) {
    const tags = await tagSearch(tag, 1);
    return success(tags.items && tags.items.length ? tags.items : []);
  } else return failure({ error: "Missing tag" }); // Return an error if a tag is not received
};

export const subjectLineGeneration = async (event: any) => {
  console.log(event.body);
  //optionalEmoji | true, false
  //exampleSubject line
  //industry | default, automotive, education, finance, healthcare, insurance, government, manufacturing, retail, technology, travel, hospitality
  //numberToGenerate | up to 20
  //maxLength | up to 100
  //avoidPunctuation | true, false
  //tone | default, positive, negative, neutral, excited, surprised
  //test
  const mid = event?.headers?.mid;
  if (mid === ENV.SFMC_MID) {
    return success([
      {
        sl: "Subject Line 1",
        score: 0.5,
      },
      {
        sl: "Subject Line 2",
        score: 0.45,
      },
      {
        sl: "Subject Line 3",
        score: 0.44,
      },
      {
        sl: "Subject Line 4",
        score: 0.42,
      },
      {
        sl: "Subject Line 5",
        score: 0.3,
      },
      {
        sl: "Subject Line 6",
        score: 0.29,
      },
      {
        sl: "Subject Line 7",
        score: 0.28,
      },
      {
        sl: "Subject Line 8",
        score: 0.24,
      },
      {
        sl: "Subject Line 9",
        score: 0.2,
      },
      {
        sl: "Subject Line 10",
        score: 0.14,
      },
    ]);
  } else {
    return unauthorized({ error: "Unauthorized" });
  }
};
