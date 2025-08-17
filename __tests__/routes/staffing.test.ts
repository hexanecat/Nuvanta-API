import request from 'supertest';
import express from 'express';
import staffingRoutes from '../../routes/staffing';

describe('Staffing Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/staffing', staffingRoutes);
  });

  describe('GET /api/staffing', () => {
    it('should return current staffing data', async () => {
      const response = await request(app)
        .get('/api/staffing')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('onDuty');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('dayShift');
      expect(response.body).toHaveProperty('nightShift');
      
      // Verify data types
      expect(typeof response.body.onDuty).toBe('number');
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.dayShift).toBe('number');
      expect(typeof response.body.nightShift).toBe('number');
    });

    it('should have day and night shifts add up to total', async () => {
      const response = await request(app)
        .get('/api/staffing')
        .expect(200);

      const { dayShift, nightShift, total } = response.body;
      expect(dayShift + nightShift).toBe(total);
    });

    it('should return valid staffing numbers', async () => {
      const response = await request(app)
        .get('/api/staffing')
        .expect(200);

      expect(response.body.onDuty).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.dayShift).toBeGreaterThanOrEqual(0);
      expect(response.body.nightShift).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/staffing/burnout', () => {
    it('should return burnout risk data', async () => {
      const response = await request(app)
        .get('/api/staffing/burnout')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('staff');
      expect(response.body).toHaveProperty('lastUpdated');
      
      // Verify data types
      expect(typeof response.body.count).toBe('number');
      expect(Array.isArray(response.body.staff)).toBe(true);
      expect(typeof response.body.lastUpdated).toBe('string');
    });

    it('should have consistent staff count', async () => {
      const response = await request(app)
        .get('/api/staffing/burnout')
        .expect(200);

      const { count, staff } = response.body;
      expect(staff.length).toBe(count);
    });

    it('should return staff with name property', async () => {
      const response = await request(app)
        .get('/api/staffing/burnout')
        .expect(200);

      if (response.body.staff.length > 0) {
        response.body.staff.forEach((staffMember: any) => {
          expect(staffMember).toHaveProperty('name');
          expect(typeof staffMember.name).toBe('string');
        });
      }
    });

    it('should have non-negative burnout count', async () => {
      const response = await request(app)
        .get('/api/staffing/burnout')
        .expect(200);

      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });
});
