const { Client, CheckoutAPI } = require('@adyen/api-library');

// Configuration du client Adyen
const client = new Client({
  apiKey: process.env.ADYEN_API_KEY,
  environment: process.env.ADYEN_ENVIRONMENT || 'TEST'
});

// API Checkout (pour créer des sessions POS Mobile)
const checkout = new CheckoutAPI(client);

// Créer une session POS Mobile
async function createPOSMobileSession(deviceId, userId) {
  try {
    const sessionRequest = {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      store: 'store_default',
      reference: `session_${Date.now()}`,
      sdkVersion: '1.0.0',
      deviceName: deviceId
    };

    console.log('📱 Création session POS Mobile...', sessionRequest);
    
    // Pour l'instant, on simule la réponse
    // Plus tard, on utilisera checkout.sessions() pour créer une vraie session
    const mockSession = {
      sessionToken: `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: `sess_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // +1 heure
    };

    console.log('✅ Session créée:', mockSession.sessionId);
    return mockSession;

  } catch (error) {
    console.error('❌ Erreur création session:', error.message);
    throw error;
  }
}

// Créer une PaymentRequest (Terminal API)
function createPaymentRequest(amount, currency, transactionId) {
  const paymentRequest = {
    SaleToPOIRequest: {
      MessageHeader: {
        ProtocolVersion: '3.0',
        MessageClass: 'Service',
        MessageCategory: 'Payment',
        MessageType: 'Request',
        ServiceID: transactionId,
        SaleID: 'TapToPayPOS',
        POIID: 'V400m-test'
      },
      PaymentRequest: {
        SaleData: {
          SaleTransactionID: {
            TransactionID: transactionId,
            TimeStamp: new Date().toISOString()
          },
          SaleToAcquirerData: {
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
          }
        },
        PaymentTransaction: {
          AmountsReq: {
            Currency: currency,
            RequestedAmount: amount / 100 // Conversion centimes -> unités
          }
        }
      }
    }
  };

  console.log('💳 PaymentRequest créée:', transactionId);
  return paymentRequest;
}

// Créer un ReversalRequest
function createReversalRequest(originalTransactionId) {
  const reversalRequest = {
    SaleToPOIRequest: {
      MessageHeader: {
        ProtocolVersion: '3.0',
        MessageClass: 'Service',
        MessageCategory: 'Reversal',
        MessageType: 'Request',
        ServiceID: `rev_${Date.now()}`,
        SaleID: 'TapToPayPOS',
        POIID: 'V400m-test'
      },
      ReversalRequest: {
        OriginalPOITransaction: {
          POITransactionID: {
            TransactionID: originalTransactionId,
            TimeStamp: new Date().toISOString()
          }
        },
        ReversalReason: 'MerchantCancel'
      }
    }
  };

  console.log('🔄 ReversalRequest créé pour:', originalTransactionId);
  return reversalRequest;
}

module.exports = {
  client,
  checkout,
  createPOSMobileSession,
  createPaymentRequest,
  createReversalRequest
};