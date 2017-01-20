#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <unistd.h>
#include <libserialport.h>

#define DEBUG false

#define SERIAL_PORT_PREFIX "/dev/ttyS"

#define ACK 0x06
#define NAK 0x15
#define STX 0x02
#define ETX 0x03
#define SERIAL_PORT_BUFFER_LENGTH 256

#define allocator(element, type) _allocator(element, sizeof(type))

void *_allocator(size_t element, size_t typeSize)
{
    void *ptr = NULL;
    if( (ptr = calloc(element, typeSize)) == NULL)
    { exit(1); }
    return ptr;
}

void parse_response(char *serial_port_buffer, int serial_port_num)
{
  int i = 0;
  for(; i < serial_port_num;i++){
    printf("%C", serial_port_buffer[i]);
  }
}

char *get_serial_port_name(char *path)
{
  char *serial_port_name = malloc(sizeof(char)* (strlen(SERIAL_PORT_PREFIX) + 1));
  int port_num = 0;
  FILE *file_setting;
  char file_path[strlen(path) + 1];
  snprintf(file_path, sizeof(file_path), "%s", path);
  file_setting = fopen(file_path, "r");
  fscanf(file_setting, "%d,", &port_num);
  fclose(file_setting);
  sprintf(serial_port_name, "%s%d", SERIAL_PORT_PREFIX, port_num);
  return serial_port_name;
}

int serial_communicate(char *serial_port_name, unsigned char *response)
{
  FILE *file_in;
  size_t in_length;
  struct sp_port *serial_port;
  struct sp_port_config *serial_port_config;
  unsigned char *output_buffer;
  output_buffer = response;

  if (sp_get_port_by_name(serial_port_name, &serial_port) != SP_OK) {
    sprintf(output_buffer, "%s", "<EDC><TRANS><T3900>99999</T3900><ErrMsg>Can not find the serial port.</ErrMsg></TRANS></EDC>");
    return(0);
  }

  if (sp_open(serial_port, SP_MODE_READ_WRITE) != SP_OK) {
    sprintf(output_buffer, "%s", "<EDC><TRANS><T3900>99998</T3900><ErrMsg>Can not open the serial port.</ErrMsg></TRANS></EDC>");
    return(0);
  }

  sp_new_config(&serial_port_config);
  sp_set_config_baudrate(serial_port_config, 115200);
  sp_set_config_parity(serial_port_config, SP_PARITY_NONE);
  sp_set_config_bits(serial_port_config, 8);
  sp_set_config_stopbits(serial_port_config, 1);
  sp_set_config_flowcontrol(serial_port_config, SP_FLOWCONTROL_NONE);

  if (sp_set_config(serial_port, serial_port_config) != SP_OK) {
    sprintf(output_buffer, "%s", "<EDC><TRANS><T3900>99997</T3900><ErrMsg>Can not configure the serial port.</ErrMsg></TRANS></EDC>");
    return(0);
  }

  char *request_buffer, *ptr;

  file_in = fopen("in.data", "rb");

  if (!file_in) {
    sprintf(output_buffer, "%s", "<EDC><TRANS><T3900>99996</T3900><ErrMsg>Can not get the input request.</ErrMsg></TRANS></EDC>");
    return(0);
  }

  fseek (file_in, 0, SEEK_END);
  in_length = ftell(file_in);
  fseek (file_in, 0, SEEK_SET);

  request_buffer = allocator((in_length + 3), char);
  ptr = request_buffer;
  *ptr = STX;
  ptr++;

  while (!feof(file_in)) {
    *ptr = fgetc(file_in);
    ptr++;
  }

  fclose(file_in);

  *ptr = ETX;
  ptr++;
  *ptr = '\0';

  sp_nonblocking_write(serial_port, request_buffer, strlen(request_buffer));

  sp_flush(serial_port, SP_BUF_INPUT);

  char serial_port_buffer[0];
  int serial_port_num = 0;
  serial_port_num = sp_blocking_read(serial_port, serial_port_buffer, 1, 2000);
  if (DEBUG) {
    printf("%02x\n", serial_port_buffer[0]);
  }

  if (serial_port_num <= 0) {
    sprintf(output_buffer, "%s", "<EDC><TRANS><T3900>99995</T3900><ErrMsg>Can not get the EDC response.</ErrMsg></TRANS></EDC>");
    return(0);
  }

  if (serial_port_buffer[0] == NAK){
    sprintf(output_buffer, "%s", "<EDC><TRANS><T3900>99994</T3900><ErrMsg>Error request.</ErrMsg></TRANS></EDC>");
    return(0);
  }

  if (serial_port_buffer[0] == ACK) {
    char current_end = 0;
    size_t output_length = 0;
    do {
      usleep(100000);
      int input_waiting = sp_input_waiting(serial_port);
      if (DEBUG) {
        printf("input_waiting:%i\n", input_waiting);
      }
      if (input_waiting > 0) {
        unsigned char tmp_buffer[SERIAL_PORT_BUFFER_LENGTH];
        int read_num = sp_blocking_read(serial_port, tmp_buffer, SERIAL_PORT_BUFFER_LENGTH, 1000);
        if (DEBUG) {
          printf("read_num:%i\n", read_num);
          parse_response(tmp_buffer, read_num);
        }
        current_end = tmp_buffer[read_num - 1];

        int i = 0;
        for (; i < read_num; i++) {
          if (tmp_buffer[i] != STX && tmp_buffer[i] != ETX) {
            output_buffer[output_length] = tmp_buffer[i];
            output_length++;
          }
        }
      }
    } while(current_end != ETX);
    output_buffer[output_length] = '\0';
    if (DEBUG) {
      printf("read end\n");
      parse_response(output_buffer, strlen(output_buffer));
    }

    sp_flush(serial_port, SP_BUF_BOTH);
    char finish_signal[1];
    *finish_signal = ACK;
    sp_nonblocking_write(serial_port, finish_signal, 1);

  } else {
    sprintf(output_buffer, "%s", "<EDC><TRANS><T3900>99993</T3900><ErrMsg>Unknown error has occurred, please try again. Check your machine.</ErrMsg></TRANS></EDC>");
    return(0);
  }

  sp_close(serial_port);
  sp_free_config(serial_port_config);
  sp_free_port(serial_port);
  return(1);
}

int main(int argc, char* argv[])
{
  char *setting_file = "setting.ini";
  char *serial_port_name;
  unsigned char response[8192];
  serial_port_name = get_serial_port_name(setting_file);
  serial_communicate(serial_port_name, response);
  printf("%s", response);
}