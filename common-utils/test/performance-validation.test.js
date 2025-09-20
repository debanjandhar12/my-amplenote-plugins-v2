import sinon from 'sinon';
import { mockApp, mockNote } from '../amplenote-mocks.js';

describe('Sinon performance validation', () => {

    it('should create mock apps efficiently', () => {
        const startTime = performance.now();
        const iterations = 1000;
        
        for (let i = 0; i < iterations; i++) {
            const app = mockApp();
            // Verify it's a proper mock
            expect(app.createNote.isSinonProxy).toBe(true);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Should complete 1000 iterations in reasonable time (less than 2 seconds)
        expect(duration).toBeLessThan(2000);
        console.log(`Created ${iterations} mock apps in ${duration.toFixed(2)}ms`);
    });

    it('should handle large numbers of stub calls efficiently', () => {
        const app = mockApp();
        const startTime = performance.now();
        const iterations = 10000;
        
        // Configure stub behavior
        app.createNote.returns({ uuid: 'test-uuid', name: 'Test Note' });
        
        for (let i = 0; i < iterations; i++) {
            app.createNote(`Note ${i}`, [], `Content ${i}`);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Verify all calls were tracked
        expect(app.createNote.callCount).toBe(iterations);
        
        // Should handle 10k calls efficiently (less than 500ms)
        expect(duration).toBeLessThan(500);
        console.log(`Handled ${iterations} stub calls in ${duration.toFixed(2)}ms`);
    });

    it('should handle async operations efficiently', async () => {
        const app = mockApp();
        const startTime = performance.now();
        const iterations = 1000;
        
        // Configure async behavior
        app.getNoteImages.resolves([{ src: 'test.png', text: 'Test' }]);
        
        const promises = [];
        for (let i = 0; i < iterations; i++) {
            promises.push(app.getNoteImages());
        }
        
        const results = await Promise.all(promises);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Verify all promises resolved correctly
        expect(results).toHaveLength(iterations);
        expect(app.getNoteImages.callCount).toBe(iterations);
        
        // Should handle 1k async operations efficiently (less than 200ms)
        expect(duration).toBeLessThan(200);
        console.log(`Handled ${iterations} async operations in ${duration.toFixed(2)}ms`);
    });

    it('should handle note operations efficiently', () => {
        const startTime = performance.now();
        const iterations = 1000;
        
        for (let i = 0; i < iterations; i++) {
            const note = mockNote(`Content ${i}`, `Note ${i}`, `uuid-${i}`, [`tag-${i}`]);
            
            // Perform some operations
            note.insertContent(`\nAdded content ${i}`);
            note.sections();
            
            // Verify note properties
            expect(note.name).toBe(`Note ${i}`);
            expect(note.uuid).toBe(`uuid-${i}`);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Should handle 1k note operations efficiently (less than 300ms)
        expect(duration).toBeLessThan(300);
        console.log(`Handled ${iterations} note operations in ${duration.toFixed(2)}ms`);
    });

    it('should handle sandbox creation and cleanup efficiently', () => {
        const startTime = performance.now();
        const iterations = 1000;
        
        for (let i = 0; i < iterations; i++) {
            const testSandbox = sinon.createSandbox();
            
            // Create some stubs
            const stub1 = testSandbox.stub();
            const stub2 = testSandbox.stub();
            
            stub1.returns(`result-${i}`);
            stub2.resolves(`async-result-${i}`);
            
            // Use the stubs
            const result1 = stub1();
            expect(result1).toBe(`result-${i}`);
            
            // Clean up
            testSandbox.restore();
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Should handle 1k sandbox cycles efficiently (less than 500ms)
        expect(duration).toBeLessThan(500);
        console.log(`Handled ${iterations} sandbox cycles in ${duration.toFixed(2)}ms`);
    });

    it('should maintain consistent performance across multiple test runs', () => {
        const runs = 5;
        const iterations = 500;
        const durations = [];
        
        for (let run = 0; run < runs; run++) {
            const startTime = performance.now();
            
            for (let i = 0; i < iterations; i++) {
                const app = mockApp();
                app.createNote.returns({ uuid: `uuid-${i}` });
                app.createNote(`Note ${i}`);
                expect(app.createNote.calledOnce).toBe(true);
                
                // Reset for next iteration
                app.createNote.resetHistory();
            }
            
            const endTime = performance.now();
            durations.push(endTime - startTime);
        }
        
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / runs;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        
        // Performance should be consistent (max shouldn't be more than 2x min)
        expect(maxDuration / minDuration).toBeLessThan(2);
        
        console.log(`Performance consistency: avg=${avgDuration.toFixed(2)}ms, min=${minDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`);
    });

    it('should handle memory cleanup properly', () => {
        const initialMemory = process.memoryUsage().heapUsed;
        const iterations = 1000;
        
        // Create and destroy many objects
        for (let i = 0; i < iterations; i++) {
            const app = mockApp();
            const note = mockNote(`Content ${i}`, `Note ${i}`, `uuid-${i}`);
            
            // Use the objects
            app.createNote.returns(note);
            const result = app.createNote();
            expect(result).toBe(note);
            
            // Objects should be eligible for garbage collection after this iteration
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 200MB for 1k objects)
        expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
        
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB for ${iterations} objects`);
    });
});