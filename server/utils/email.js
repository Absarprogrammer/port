const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'IT Help Desk'} <${process.env.FROM_EMAIL || 'noreply@example.com'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message.replace(/\n/g, '<br>')
    };

    if (!transporter) {
      console.log('--- MOCK EMAIL SENT (No SMTP Configured) ---');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Message: ${mailOptions.text}`);
      console.log('-------------------------------------------');
      return;
    }

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email could not be sent:', error);
  }
};

const sendTicketCreatedEmail = async (user, ticket) => {
  const message = `Hello ${user.name},\n\nYour ticket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}" has been created successfully.\n\nPriority: ${ticket.priority}\nCategory: ${ticket.category}\n\nWe will notify you when an agent is assigned.`;
  await sendEmail({
    email: user.email,
    subject: `Ticket Created: ${ticket.title}`,
    message
  });
};

const sendTicketAssignedEmail = async (agent, ticket) => {
  const message = `Hello ${agent.name},\n\nYou have been assigned a new ticket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}".\n\nPriority: ${ticket.priority}\n\nPlease check your dashboard.`;
  await sendEmail({
    email: agent.email,
    subject: `New Ticket Assigned: ${ticket.title}`,
    message
  });
};

const sendTicketStatusChangedEmail = async (user, ticket) => {
  const message = `Hello ${user.name},\n\nYour ticket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}" status has been changed to: ${ticket.status}.\n\nPlease check your dashboard for more details.`;
  await sendEmail({
    email: user.email,
    subject: `Ticket Status Updated: ${ticket.title}`,
    message
  });
};

const sendTicketResolvedEmail = async (user, ticket) => {
  const message = `Hello ${user.name},\n\nYour ticket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}" has been marked as RESOLVED.\n\nIf you have any further issues, you may request to reopen it or leave a comment.`;
  await sendEmail({
    email: user.email,
    subject: `Ticket Resolved: ${ticket.title}`,
    message
  });
};

const sendTicketClosedEmail = async (user, ticket) => {
  const message = `Hello ${user.name},\n\nYour ticket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}" has been CLOSED.\n\nThank you for using the IT Help Desk.`;
  await sendEmail({
    email: user.email,
    subject: `Ticket Closed: ${ticket.title}`,
    message
  });
};

const sendWelcomeEmail = async (user, loginUrl) => {
  const message = `Hello ${user.name},\n\nWelcome to the IT Help Desk System.\n\nYour account has been successfully created.\nRole: ${user.role}\nDepartment: ${user.department ? user.department.name : 'N/A'}\n\nYou can login at: ${loginUrl}\n\nIf you have any questions, please contact the IT Help Desk.`;
  await sendEmail({
    email: user.email,
    subject: 'Welcome to the IT Help Desk System',
    message
  });
};

const sendRoleChangeEmail = async (user, oldRole, newRole) => {
  const message = `Hello ${user.name},\n\nYour account role has been updated.\n\nPrevious Role: ${oldRole}\nNew Role: ${newRole}\n\nThis change is effective immediately. Please contact your Administrator if this was unexpected.`;
  await sendEmail({
    email: user.email,
    subject: 'Your Account Role Has Been Updated',
    message
  });
};

const sendDepartmentChangeEmail = async (user, oldDeptName, newDeptName) => {
  const message = `Hello ${user.name},\n\nYour department assignment has been updated.\n\nPrevious Department: ${oldDeptName}\nNew Department: ${newDeptName}\n\nThis change is effective immediately.`;
  await sendEmail({
    email: user.email,
    subject: 'Department Assignment Updated',
    message
  });
};

const sendManagerNewTicketEmail = async (manager, ticket, employeeName, deptName) => {
  const message = `Hello ${manager.name},\n\nA new ticket has been created in your department (${deptName}).\n\nTicket ID: #${ticket._id.toString().slice(-6).toUpperCase()}\nTitle: ${ticket.title}\nPriority: ${ticket.priority}\nCategory: ${ticket.category}\nCreated By: ${employeeName}\n\nPlease review the ticket and assign it to an available support agent.`;
  await sendEmail({
    email: manager.email,
    subject: 'New Ticket Created in Your Department',
    message
  });
};

const sendTicketReassignedFromEmail = async (previousAgent, ticket, newAgentName) => {
  const message = `Hello ${previousAgent.name},\n\nTicket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}" has been reassigned from you to ${newAgentName}.`;
  await sendEmail({
    email: previousAgent.email,
    subject: 'Ticket Reassigned From You',
    message
  });
};

const sendTicketReassignedToEmail = async (newAgent, ticket, previousAgentName) => {
  const message = `Hello ${newAgent.name},\n\nTicket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}" has been reassigned to you (previously assigned to ${previousAgentName}).\n\nPlease check your dashboard.`;
  await sendEmail({
    email: newAgent.email,
    subject: 'New Ticket Assigned To You',
    message
  });
};

const sendTicketReopenedEmail = async (user, ticket, reopenedBy) => {
  const message = `Hello ${user.name},\n\nTicket #${ticket._id.toString().slice(-6).toUpperCase()} "${ticket.title}" has been reopened by ${reopenedBy}.\n\nCurrent Status: ${ticket.status}\n\nPlease review the ticket for any new updates.`;
  await sendEmail({
    email: user.email,
    subject: 'Ticket Reopened',
    message
  });
};

module.exports = {
  sendEmail,
  sendTicketCreatedEmail,
  sendTicketAssignedEmail,
  sendTicketStatusChangedEmail,
  sendTicketResolvedEmail,
  sendTicketClosedEmail,
  sendWelcomeEmail,
  sendRoleChangeEmail,
  sendDepartmentChangeEmail,
  sendManagerNewTicketEmail,
  sendTicketReassignedFromEmail,
  sendTicketReassignedToEmail,
  sendTicketReopenedEmail
};
