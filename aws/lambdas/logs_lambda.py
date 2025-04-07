import base64
import boto3
import gzip
import json
import logging
import os

from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def logpayload(event):
    logger.setLevel(logging.DEBUG)
    logger.debug(event['awslogs']['data'])
    compressed_payload = base64.b64decode(event['awslogs']['data'])
    uncompressed_payload = gzip.decompress(compressed_payload)
    log_payload = json.loads(uncompressed_payload)
    return log_payload

class Error_object(object):
    pass

def errors(payload):
    errorsArray = []
    log_events = payload['logEvents']
    logger.debug(payload)
    loggroup = payload['logGroup']
    logstream = payload['logStream']
    lambda_func_name = loggroup.split('/')
    logger.debug(f'LogGroup: {loggroup}')
    logger.debug(f'Logstream: {logstream}')
    #logger.debug(f'Function name: {lambda_func_name[3]}')
    logger.debug(log_events)
    for log_event in log_events:
        #if(log_event['level_name'] == "ERROR" or log_event['level_name'] == "ALERT"):

            error_object = Error_object()
            #error_object.level_name = log_event['level_name']
            error_object.message = log_event['message']
            #error_object.context = log_event['context']
            #error_object.datetime = log_event['datetime']

            errorsArray.append(error_object)


    return loggroup, logstream, errorsArray #, lambda_func_name


def publish_message(loggroup, logstream, error_msg): #, lambda_func_name):
    sns_arn = os.environ['snsARN']
    snsclient = boto3.client('sns')
    try:
        message = ""
        message += "\nBOILERPLATE - Sumario de errores en monitoreo de logs" + "\n\n"
        message += "##########################################################\n"
        message += "# LogGroup Name:- " + str(loggroup) + "\n"
        message += "# LogStream:- " + str(logstream) + "\n"
        message += "# Mensaje:- " + "\n"
        message += "# \t\t" + str(error_msg.split("\n")) + "\n"
        message += "#######################{###################################\n"

        # Sending the notification...
        snsclient.publish(
            TargetArn=sns_arn,
            Subject=f'Monitoreo de Logs de BOILERPLATE', # {lambda_func_name[3]}
            Message=message
        )
    except ClientError as e:
        logger.error("An error occured: %s" % e)


def parse_errors(errors): # TODO add type parse_errors(errors:Error_object): -> void
    message = "";
    for e in errors:
        message += "error - \n"
        message += "Mensaje:" + e.message +  "\n"
        #logger.info(e.message)
        #message += "Fecha: "+ e.datetime +" Level:" + e.level_name + "Mensaje:" + e.message +  "\n"
        #message +=  e.context #TODO: probablemente esto haya que decodificarlo

    return message

def lambda_handler(event, context):
    pload = logpayload(event)
    #logger.info(errors(pload))
    lgroup, lstream, errorsArray = errors(pload) #, lambdaname = errors(pload)

    errmessage = parse_errors(errorsArray)
    logger.info(errmessage)

    #publish_message(lgroup, lstream, errmessage, lambdaname)
    publish_message(lgroup, lstream, errmessage)

    return {
        'content': errmessage
    }
