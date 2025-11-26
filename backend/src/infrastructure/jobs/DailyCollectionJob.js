import cron from 'node-cron';
import { CollectDataUseCase } from '../../application/useCases/CollectDataUseCase.js';
import { getCacheRepository } from '../repositories/CacheRepositorySingleton.js';
import { RetryService } from '../services/RetryService.js';
import { auditLogger } from '../services/AuditLogger.js';

let collectDataUseCase;

export const initializeDailyCollection = (jwtToken) => {
  const cacheRepository = getCacheRepository();
  const retryService = new RetryService();
  
  collectDataUseCase = new CollectDataUseCase(
    cacheRepository,
    retryService
  );

  // Schedule daily collection at 07:00 AM
  cron.schedule('0 7 * * *', async () => {
    console.log('Starting daily data collection at 07:00 AM');
    auditLogger.logDataCollection('initiated', {
      scheduled: true,
      time: new Date().toISOString()
    });
    
    try {
      const results = await collectDataUseCase.execute(jwtToken);
      console.log('Data collection completed:', results);
      
      auditLogger.logDataCollection(results.partial ? 'partial' : 'success', {
        successful: results.successful,
        failed: results.failed,
        services: {
          total: results.successful.length + results.failed.length,
          successful: results.successful.length,
          failed: results.failed.length
        }
      });
      
      if (results.partial) {
        console.warn('Partial data collection - some services failed:', results.failed);
        auditLogger.logDataCollection('partial', {
          failedServices: results.failed
        });
      }
    } catch (error) {
      console.error('Daily collection error:', error);
      auditLogger.logDataCollection('failure', {
        error: error.message,
        stack: error.stack
      });
    }
  });

  console.log('Daily collection job scheduled for 07:00 AM');
};

export const triggerManualCollection = async (jwtToken, services = null) => {
  // Use singleton cache repository to ensure data is shared
  const cacheRepository = getCacheRepository();
  const retryService = new RetryService();
  
  const useCase = new CollectDataUseCase(
    cacheRepository,
    retryService
  );

  console.log('triggerManualCollection - Starting data collection...');
  console.log('triggerManualCollection - Cache repository instance:', cacheRepository.constructor.name);
  const results = await useCase.execute(jwtToken, services);
  console.log('triggerManualCollection - Results:', {
    successful: results.successful?.length || 0,
    failed: results.failed?.length || 0
  });
  
  return results;
};

