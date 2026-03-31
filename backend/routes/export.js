const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Export to CSV
router.get('/csv/:transcriptId', async (req, res) => {
  try {
    const { transcriptId } = req.params;

    const transcriptResult = await global.db.query(
      'SELECT * FROM transcripts WHERE id = $1',
      [transcriptId]
    );

    if (transcriptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const decisionsResult = await global.db.query(
      'SELECT * FROM decisions WHERE transcript_id = $1',
      [transcriptId]
    );

    const actionItemsResult = await global.db.query(
      'SELECT * FROM action_items WHERE transcript_id = $1',
      [transcriptId]
    );

    const allData = [
      ...decisionsResult.rows.map((d) => ({
        type: 'Decision',
        content: d.decision,
        assigned_to: '',
        due_date: '',
        completed: '',
      })),
      ...actionItemsResult.rows.map((a) => ({
        type: 'Action Item',
        content: a.action,
        assigned_to: a.assigned_to || '',
        due_date: a.due_date ? new Date(a.due_date).toLocaleDateString() : '',
        completed: a.completed ? 'Yes' : 'No',
      })),
    ];

    const parser = new Parser({ fields: ['type', 'content', 'assigned_to', 'due_date', 'completed'] });
    const csv = parser.parse(allData);

    const filename = transcriptResult.rows[0].title.replace(/[^a-z0-9]/gi, '_');
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export to PDF
router.get('/pdf/:transcriptId', async (req, res) => {
  try {
    const { transcriptId } = req.params;

    const transcriptResult = await global.db.query(
      'SELECT * FROM transcripts WHERE id = $1',
      [transcriptId]
    );

    if (transcriptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const decisionsResult = await global.db.query(
      'SELECT * FROM decisions WHERE transcript_id = $1',
      [transcriptId]
    );

    const actionItemsResult = await global.db.query(
      'SELECT * FROM action_items WHERE transcript_id = $1',
      [transcriptId]
    );

    const doc = new PDFDocument({ margin: 50 });
    const filename = transcriptResult.rows[0].title.replace(/[^a-z0-9]/gi, '_');
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="${filename}.pdf"`);

    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('Meeting Intelligence Hub', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold').text(transcriptResult.rows[0].title, { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#666666')
      .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Decisions');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    if (decisionsResult.rows.length === 0) {
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text('No decisions recorded.');
    } else {
      decisionsResult.rows.forEach((d) => {
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(`• ${d.decision}`, { indent: 10 });
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Action Items');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    if (actionItemsResult.rows.length === 0) {
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text('No action items recorded.');
    } else {
      actionItemsResult.rows.forEach((a) => {
        const dueDate = a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No date';
        const assignee = a.assigned_to || 'TBD';
        const status = a.completed ? 'Completed' : 'Pending';
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(`• ${a.action}`, { indent: 10 });
        doc.fontSize(10).font('Helvetica').fillColor('#555555')
          .text(`  Assigned to: ${assignee} | Due: ${dueDate} | Status: ${status}`, { indent: 20 });
        doc.moveDown(0.3);
      });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
