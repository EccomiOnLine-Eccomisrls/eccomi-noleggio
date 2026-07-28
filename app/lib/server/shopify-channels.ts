import { shopifyAdminFetch } from "./shopify";

export interface ShopifyPublicationResult {
  publicationId: string;
  publicationName: string;
  published: boolean;
  error?: string;
}

async function getPublications() {
  const query = `
    query {
      publications(first: 50) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `;

  const response = await shopifyAdminFetch(query);

  if (response.errors?.length) {
    throw new Error(response.errors[0].message);
  }

  return (
    response.data?.publications?.edges?.map(
      (edge: {
        node: {
          id: string;
          name: string;
        };
      }) => edge.node,
    ) ?? []
  );
}

async function publishOnPublication(
  productId: string,
  publicationId: string,
  publicationName: string,
): Promise<ShopifyPublicationResult> {
  const mutation = `
    mutation PublishProduct($id: ID!, $publicationId: ID!) {
      publishablePublish(
        id: $id
        input: [
          {
            publicationId: $publicationId
          }
        ]
      ) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await shopifyAdminFetch(mutation, {
      id: productId,
      publicationId,
    });

    const errors =
      response.data?.publishablePublish?.userErrors ?? [];

    if (errors.length > 0) {
      return {
        publicationId,
        publicationName,
        published: false,
        error: errors.map((e: any) => e.message).join(", "),
      };
    }

    return {
      publicationId,
      publicationName,
      published: true,
    };
  } catch (error) {
    return {
      publicationId,
      publicationName,
      published: false,
      error:
        error instanceof Error
          ? error.message
          : "Errore sconosciuto",
    };
  }
}

export async function publishProductToAllConfiguredShopifyChannels(
  productId: string,
): Promise<ShopifyPublicationResult[]> {
  const publications = await getPublications();

  if (publications.length === 0) {
    return [];
  }

  const results: ShopifyPublicationResult[] = [];

  for (const publication of publications) {
    const result = await publishOnPublication(
      productId,
      publication.id,
      publication.name,
    );

    results.push(result);
  }

  return results;
}