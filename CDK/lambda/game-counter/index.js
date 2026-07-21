const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const PK = 'GAME';
const SK = 'COUNTER';

exports.handler = async (event) => {
  const method = event.httpMethod;

  try {
    if (method === 'PUT') {
      // Increment the game start counter
      const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK, SK },
        UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc',
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: { ':zero': 0, ':inc': 1 },
        ReturnValues: 'UPDATED_NEW',
      }));

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          message: 'Game started',
          count: result.Attributes.count,
        }),
      };
    }

    if (method === 'GET') {
      // Retrieve the current count
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK, SK },
      }));

      const count = result.Item ? result.Item.count : 0;

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ count }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
