<?php 
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        // 1. UDC Types (Categories)
        Schema::create('udc_types', function (Blueprint $table) {
            $table->string('system_code', 10);
            $table->string('udc_type', 10);
            $table->string('type_description', 150);
            $table->integer('max_length')->default(10);
            $table->timestamps();
            
            $table->primary(['system_code', 'udc_type']);
        });

        // 2. UDC Values (Dropdown Items)
        Schema::create('udc_values', function (Blueprint $table) {
            $table->id();
            $table->string('system_code', 10);
            $table->string('udc_type', 10);
            $table->string('udc_code', 20);
            $table->string('description_1', 150);
            $table->string('description_2', 150)->nullable();
            $table->string('special_handling_code', 50)->nullable();
            $table->boolean('is_hardcoded')->default(0);
            $table->boolean('is_active')->default(1);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['system_code', 'udc_type', 'udc_code']);
            $table->foreign(['system_code', 'udc_type'])->references(['system_code', 'udc_type'])->on('udc_types')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('udc_values');
        Schema::dropIfExists('udc_types');
    }
};